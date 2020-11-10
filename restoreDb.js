const config = require('./config.json');
const {run, runsql, log, today, yesterday} = require('./utils.js');
const fs = require('fs'); 

function getBakList(){
	let files = fs.readdirSync(config.zRestorePath);
	files = files.filter(f=>f.match(/\.bak\.7z$/));
	
	files = files.reduce((last, cur)=>{
		let ms = cur.match(/(.*)-(\d)\.bak\.7z$/);
		//console.log(ms);
		let db = ms[1];
		let f = ms[0];
		if (last[db]) {
			last[db].push(f);
		}
		else {
			last[db] = [f];
		}
		return last;
	}, {});
	
	let dbs = [];
	for (let db of Object.keys(files)){
		files[db]
		let last = {
			file: files[db],
			tm: new Date('2020-01-01')
		}
		for (let f of files[db]){
			let stats = fs.statSync(`${config.zRestorePath}${f}`);
			let tm = stats.mtime;
			if (tm > last.tm) last = {
				file: f,
				tm: tm
			}
		}
	
		let s = db.split('-');
		dbs.push({server: s[0], db:s[1], file:last.file.replace(/\.7z$/, ''), tm:last.tm})
	}
	return dbs;	
}

function restoreDb2(cfg){
	let dbs = getBakList();
	//console.log(dbs);

	let db = dbs.find((db)=>db.server == cfg.fromServer && db.db == cfg.fromDb);
	db.toDb = cfg.toDb;
	console.log(db);

	if (db.tm.toYMD() != today.ymd) {
		console.log("cannot find today backup");
	}
	else{
		run(`7z x -y -p2020 ${config.zRestorePath}${db.file}.7z -o${config.restorePath}`)

		let sql = `
			BEGIN TRY
				ALTER DATABASE ${db.toDb} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
			END TRY
			BEGIN CATCH
				print '${db.toDb} not exist';
			END CATCH;
			
			RESTORE DATABASE [${db.toDb}] FROM DISK = N'${config.restorePath}${db.file}' WITH MOVE N'${db.db}' TO N'${config.sqlDataPath}${db.toDb}.mdf', MOVE N'${db.db}_log' TO N'${config.sqlDataPath}${db.toDb}_log.ldf';
			ALTER DATABASE ${db.toDb} SET MULTI_USER;
		`;
		runsql(sql);
		//runsql(`use ${db.toDb}; exec sp_change_users_login 'update_one', 'po', 'po'`);
	}
}

function verify(db){
	let rc = runsql(`select top 1 Date, Notes from ${db}.dbo.pos_sales order by date desc`);
	let ls = rc.split('\n');
	let l = ls[2].trim();
	ls = l.split(/\s/);
	let bak_dt = ls[0];
	return (bak_dt == today.ymd);
}

function restoreDb(dbCfg){
	//console.log(dbCfg);
	let success = dbCfg.verify();
	if (!success)	{
		dbCfg.restoreBakFile();
		success = dbCfg.verify();
	}
	
	if (success){
		console.log(`up to date: database ${dbCfg.fromServer}-${dbCfg.fromDb} is restored as ${dbCfg.toDb}`);			
	}
	else{
		console.log(`NOT up to date: database ${dbCfg.fromServer}-${dbCfg.fromDb}`);
	}
}

function dl_zbak(){
	let tsf = `${config.zRestorePath}timestamp.txt`;

	let bOutdated = false;
	try {
		let strDate = fs.readFileSync(tsf, "utf8");
		let dt = new Date(strDate)
		//console.log(strDate);

		bOutdated = (new Date()-dt)/1000 > 60*60*1;
	}
	catch(ex)
	{
		console.log(ex.toString());
		bOutdated = true;
	}

	if (bOutdated){
		console.log(`downloading...`);
		run(`rclone copy ${config.gPath} ${config.zRestorePath}`)
	
		console.log(`${config.zRestorePath}timestamp.txt`);
		let strDate = (new Date()).toISOString()
		fs.writeFileSync(tsf, strDate, "utf8");
	}
}

function patch(dbCfg){
	dbCfg.latestZBakFile = function(){
		return this.latestFile(config.zRestorePath)
	}
	
	dbCfg.latestBakFile = function(){
		let latestBakFile = this.latestFile(config.restorePath);
		//console.log(latestBakFile);
		if (!latestBakFile){
			let latestZBakFile = this.latestZBakFile();
			this.unzipZBakFile(latestZBakFile);
			latestBakFile = this.latestFile(config.restorePath);
		}
		return latestBakFile;
	}
	
	dbCfg.latestFile = function(path){
		let files = fs.readdirSync(path);
		files = files.filter(f=>f.includes(`${this.fromServer}-${this.fromDb}`));
		let files2 = [];
		for (let f of files){
			let stats = fs.statSync(`${path}${f}`);
			files2.push({
				name: f, 
				sz: stats.size, 
				tm: stats.mtime,
				toDb: this.toDb,
				data: this.data,
				log: this.log
			});
		}
		files2 = files2.sort((a, b)=>{return b.tm-a.tm});
		let file = files2[0];
		return file;
	}

	dbCfg.unzipZBakFile = function(db){
		//console.log(db);
		let cmd = `7z x -y -p2020 ${config.zRestorePath}${db.name} -o${config.restorePath}`;
		run(cmd);
	}

	dbCfg.restoreBakFile = function(){
		this.unzipZBakFile(this.latestZBakFile())

		let cfg = this.latestBakFile();
		console.log(`restoring ${cfg.toDb}`);
		//console.log(cfg);
		let sql = `
			BEGIN TRY
				ALTER DATABASE ${cfg.toDb} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
			END TRY
			BEGIN CATCH
				print '${cfg.toDb} not exist';
			END CATCH;
			
			RESTORE DATABASE [${cfg.toDb}] FROM DISK = N'${config.restorePath}${cfg.name}' WITH REPLACE, MOVE N'${cfg.data}' TO N'${config.sqlDataPath}${cfg.toDb}.mdf', MOVE N'${cfg.log}' TO N'${config.sqlDataPath}${cfg.toDb}_log.ldf';
			ALTER DATABASE ${cfg.toDb} SET MULTI_USER;
		`;

		//console.log(sql);
		runsql(sql);
	}

	dbCfg.updatedAt = function(){
		let rc = runsql(`select top 1 Date, Notes from ${this.toDb}.dbo.pos_sales order by date desc`);
		let ls = rc.split('\n');
		let l = ls[2].trim();
		ls = l.split(/\s/);
		let bak_dt = ls[0];
		return bak_dt;
	}

	dbCfg.verify = function(){
		let updatedAt = this.updatedAt();
		if (updatedAt && (updatedAt == today.ymd || updatedAt == yesterday.ymd)) return true;
		return false;
	}
}

dl_zbak();

for (let dbCfg of config.restoreDbs){
	if (dbCfg.active){
		patch(dbCfg);
		restoreDb(dbCfg);
		//let rc = verify(db.toDb);
		//console.log(rc);
	}
}
