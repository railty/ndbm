const config = require('./config.json');
const {run, runsql, log, today, host} = require('./utils.js');
const fs = require('fs'); 

function syncStore(store){
	log.info(`Sych ${store} started`);	
	runsql(`Exec Pris.[dbo].[Pull_Store_Orders] @STORE = N'${store}'`)
	runsql(`Exec Pris.[dbo].[Pull_Store_Products] @STORE = N'${store}'`)
}

try{
	for (let store of ['alp', 'ofc', 'ofmm', 'wm1117', 'wm1116', 'wm3652', 'wm3135', 'wm1080']){
		syncStore(store);
	}
	
	runsql(`Exec [dbo].[Push_Payment]`)
}
catch(e){
	log.info(e.toString());
}

