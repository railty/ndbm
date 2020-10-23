const config = require('./config.json');
const {run, runsql, log, today, host} = require('./utils.js');
const fs = require('fs'); 

function backupDb(){
	log.info("backup started");	

	let fname = `${host}-pris-${today.getDay()}.bak`;
	let backupFname = `${config.backupPath}${fname}`;
	let zbackupFname = `${config.zbackupPath}${fname}.7z`;

	if (config.runMode == 'wlm'){
		runsql(`insert into pris.dbo.pos_sales(Product_ID,Quantity,Amount,Date,Notes) values ('1234567890',999,1,getdate(),'system')`);
	}
	
	runsql(`BACKUP DATABASE [pris] TO DISK = N'${backupFname}' WITH INIT, NAME = N'pris-Database Backup ${dt}'`);
	run(`7z a -t7z -mx9 -p2020 ${zBackupFname} ${backupFname}`)
	run(`rclone copy ${zbackupFname} automan:mssqlbak-7z`)
}

backupDb();
