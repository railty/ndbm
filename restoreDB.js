const config = require('./config.json');
const {run, runsql, log, today} = require('./utils.js');
const fs = require('fs'); 

//run(`rclone copy automan:mssqlbak-7z ${config.zRestorePath}`)

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
	dbs.push({store: s[0], db:s[1], file:last.file.replace(/\.7z$/, ''), tm:last.tm})
}

//console.log(dbs);

for (let db of dbs){
	if (db.tm.toYMD() != today) {
		console.log("cannot find today backup");
	}
	else{
		//run(`7z x -p2020 ${config.zRestorePath}${db.file} -o${config.restorePath}`)

		let sql = `
			BEGIN TRY
				ALTER DATABASE ${db.store} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
			END TRY
			BEGIN CATCH
				print '${db.store} not exist';
			END CATCH;
			
			RESTORE DATABASE [${db.store}] FROM DISK = N'${config.restorePath}${db.file}' WITH FILE = 1, MOVE N'Pris' TO N'${config.sqlDataPath}${db.store}.mdf', MOVE N'Pris_log' TO N'${config.sqlDataPath}${db.store}.ldf', NOUNLOAD, STATS = 5;
			ALTER DATABASE ${db.store} SET MULTI_USER;
			
			use ${db.store};
			exec sp_change_users_login 'update_one', 'po', 'po';
		`;
		//runsql(sql);

		let rc = runsql(`select top 1 Date, Notes from ${db.store}.dbo.pos_sales order by date desc`);
		console.log("-----------------");
		let ls = rc.split('\n');
		let l = ls[2].trim();
		ls = l.split(/\s/);
		console.log(`<${ls[0]}><${ls[1]}>`);
	}
}
