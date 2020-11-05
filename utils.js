const os = require('os');
const logger = require('simple-node-logger');
const { execSync } = require('child_process');
const fs = require('fs'); 
const config = require('./config.json');

Date.prototype.toYMD = function() {
  let m = this.getMonth()+1;
  let d = this.getDate();
  if (m<10) m = '0' + m;
  if (d<10) d = '0' + d;

  return (this.getYear()+1900)+'-'+m+'-'+d;
};

Date.prototype.toHMS = function() {
  let h = this.getHours();
  let m = this.getMinutes();
  let s = this.getSeconds();
  if (h<10) h = '0' + h;
  if (m<10) m = '0' + m;
  if (s<10) s = '0' + s;
  return h+':'+m+':'+s;
};

Date.prototype.toYMDHMS = function() {
  return this.toYMD() + ' ' + this.toHMS();
};

let host = os.hostname().toLowerCase();
exports.host = host;

let td = new Date();
let today = {
	ymd: td.toYMD(),
	weekday: td.getDay()
}
td.setDate(td.getDate() - 1);
let yesterday = {
	ymd: td.toYMD(),
	weekday: td.getDay()
}

const log = logger.createSimpleFileLogger(`log/${host}-${today.ymd}.log`);

exports.log = log;
exports.today = today;
exports.yesterday = yesterday;

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
