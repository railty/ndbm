const os = require('os');
const logger = require('simple-node-logger');
const { execSync } = require('child_process');
const fs = require('fs'); 
const config = require('./config.json');

Date.prototype.toYMD = function() {
  return (this.getYear()+1900)+'-'+(this.getMonth()+1)+'-'+(this.getDate());
};

let host = os.hostname().toLowerCase();
exports.host = host;

let td = new Date();
let today = {
	ymd: td.toYMD(),
	weekday: td.getDay()
}

const log = logger.createSimpleLogger(`log/${host}-${today.ymd}.log`);

exports.log = log;
exports.today = today;

const run = function(cmd){
	log.info(cmd);
	let rc = execSync(cmd).toString();
	log.info(rc);
	return rc;
}
exports.run = run;

const runsql = function(sql){
	log.info(sql);

	fs.writeFileSync("anonymous.sql", sql); 
	if (config.sqlUser)	cmd = `sqlcmd -U ${config.sqlUser} -P ${config.sqlPass} -i anonymous.sql`;
	else cmd = "sqlcmd -E -i anonymous.sql";
	let rc = run(cmd);
	return rc;
}
exports.runsql = runsql;