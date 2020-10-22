const config = require('./config.json');
const logger = require('simple-node-logger');
const { execSync } = require('child_process');
const fs = require('fs'); 
const os = require('os');

function run(cmd){
	log.info(cmd);
	let rc = execSync(cmd).toString();
	log.info(rc);
	return rc;
}

function runsql(sql){
	log.info(sql);

  fs.writeFileSync("anonymous.sql", sql); 
	cmd = "sqlcmd -E -i anonymous.sql"
	let rc = run(cmd);
	return rc;
}

function backupDb(){
	log.info("backup started");	

	let fname = `${host}-pris-${weekday}.bak`;
	let bakfname = `${config.bakPath}${fname}`;
	let zbakfname = `${config.bakPath}${fname}.7z`;

	//select top 1 * from pris.dbo.pos_sales order by date desc
	if (config.runMode == 'wlm'){
		runsql(`insert into pris.dbo.pos_sales(Product_ID,Quantity,Amount,Date,Notes) values ('1234567890',999,1,getdate(),'system')`);
	}
	
	runsql(`BACKUP DATABASE [pris] TO DISK = N'${bakfname}' WITH INIT, NAME = N'pris-Database Backup ${dt}'`);
	run(`7z a -t7z -mx9 -p2020 ${zbakfname} ${bakfname}`)
	run(`rclone copy ${zbakfname} automan:mssqlbak-7z`)
}

let host = os.hostname();
let dt = new Date();
weekday = dt.getDay();
dt = (dt.getYear()+1900)+'-'+(dt.getMonth()+1)+'-'+(dt.getDate());
const log = logger.createSimpleLogger(`log/${host}-${dt}.log`);

backupDb();
