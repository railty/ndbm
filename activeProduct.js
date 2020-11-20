const fs = require('fs'); 
const {run, runsql, host} = require('./utils.js');

function processFile(f){
	let ls = fs.readFileSync(f, "utf8");
	ls = ls.split("\n")
	
	let sql = "";
	for (let i=1; i<ls.length; i++){
		let ds = ls[i].trim().split(",");
		if (ds.length==3){
			let r = {
				prod: ds[0],
				active: ds[2]
			};
			
			let store = stores[ds[1]];
			if (store == host){
				let cmd = `update pris.dbo.products_pris set active = ${r.active} where barcode = '${r.prod}';\n`;
				sql = sql + cmd
			}
		}
	}
	
	//console.log(sql);
	runsql(sql);
}

let stores = {
	'1970': 'alp',
	'888': 'ofc',
	'250': 'ofmm'	
};
	
let folder = "G:\\My Drive\\Active_Product\\";
let files = fs.readdirSync(folder);
for (let f of files){
	if (f.toLowerCase().match(/\.txt$/)){
		processFile(folder+f);
		run(`move "${folder}${f}" "${folder}\\done\\"`);
	}
	
}
	    
