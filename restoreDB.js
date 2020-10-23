const config = require('./config.json');
const {run, runsql, log, today} = require('./utils.js');
const fs = require('fs'); 

function dl_bak(){
	run(`rclone copy automan:mssqlbak-7z ${config.zRestorePath}`)
}

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

function restoreDb(cfg){
	let dbs = getBakList();
	//console.log(dbs);

	let db = dbs.find((db)=>db.server == cfg.fromServer && db.db == cfg.fromDb);
	db.toDb = cfg.toDb;
	console.log(db);

	if (db.tm.toYMD() != today.ymd) {
		console.log("cannot find today backup");
	}
	else{
		//run(`7z x -y -p2020 ${config.zRestorePath}${db.file}.7z -o${config.restorePath}`)

		let sql = `
			BEGIN TRY
				ALTER DATABASE ${db.toDb} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
			END TRY
			BEGIN CATCH
				print '${db.toDb} not exist';
			END CATCH;
			
			RESTORE DATABASE [${db.toDb}] FROM DISK = N'${config.restorePath}${db.file}' WITH FILE = 1, MOVE N'Pris' TO N'${config.sqlDataPath}${db.toDb}.mdf', MOVE N'Pris_log' TO N'${config.sqlDataPath}${db.toDb}.ldf', NOUNLOAD, STATS = 5;
			ALTER DATABASE ${db.toDb} SET MULTI_USER;
		`;
		runsql(sql);
		runsql(`use ${db.toDb}; exec sp_change_users_login 'update_one', 'po', 'po'`);
	}
}

function verify(db){
	let rc = runsql(`select top 1 Date, Notes from ${db}.dbo.pos_sales order by date desc`);
	console.log("-----------------");
	let ls = rc.split('\n');
	let l = ls[2].trim();
	ls = l.split(/\s/);
	let bak_dt = ls[0];
	return (bak_dt == today.ymd);
}

//dl_bak();
restoreDb({
	fromServer: 'hqsvr2', 
	fromDb: 'pris',
	toDb: 'hqsvr2'
});
restoreDb({
	fromServer: 'wm1117', 
	fromDb: 'pris',
	toDb: 'wm1117'
});

let rc = verify('wm1117')
console.log(rc);
