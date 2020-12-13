const config = require('./config.json');
const {run, runsql, log, today, host} = require('./utils.js');
const fs = require('fs'); 

function backupDb(db){
	log.info(`backup ${db} started`);	

	let fname = `${host}-${db}-${today.weekday}.bak`;
	let backupFname = `${config.backupPath}${fname}`;
	let zBackupFname = `${config.zBackupPath}${fname}.7z`;

	if (config.heartbeat){
		if (config.heartbeat == 'wlm'){
			runsql(`insert into ${db}.dbo.pos_sales(Product_ID,Quantity,Amount,Date,Notes) values ('1234567890',999,1,getdate(),'system')`);
		}
		if (config.heartbeat == 'alp'){
			runsql("exec Pris.Dbo.Refresh_POS @Full=1")
			runsql("exec Pris.Dbo.Calculate_Sales")
			runsql("exec Pris.Dbo.Build_Inventory")
		}
	}
	
	runsql(`BACKUP DATABASE [${db}] TO DISK = N'${backupFname}' WITH INIT, NAME = N'${db}-Database Backup ${today.ymd}'`);
	run(`7z a -t7z -mx9 -p2020 ${zBackupFname} ${backupFname}`)
	
	if (config.heartbeat){
		try{
			run(`rclone copy ${zBackupFname} ${config.gPath} --log-file=log/r.log --log-level INFO`)
		}
		catch(e){
			//if fail, try again
			run(`sleep 30`)
			run(`rclone copy ${zBackupFname} ${config.gPath} --log-file=log/r.log --log-level INFO`)
		}
		/*
		if (config.heartbeat == 'wlm'){

			try{
				run(`rclone copy ${zBackupFname} ${config.gPath} --log-file=log/r.log --log-level INFO`)
			}
			catch(e){
				//if fail, try again
				run(`sleep 30`)
				run(`rclone copy ${zBackupFname} ${config.gPath} --log-file=log/r.log --log-level INFO`)
			}

		}
		if (config.heartbeat == 'alp'){
			run(`copy ${zBackupFname} \"g:\\my drive\\DBBackup\\${host}\\\" `)
		}
		*/
	}
}

try{
	for (let db of config.backupDbs){
		backupDb(db);
	}
}
catch(e){
	log.info(e.toString());
}

