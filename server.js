var http = require('http');
var sockjs = require('sockjs');
var YQL = require('yql');
var schedultime = 5000;
var oldhashtable = new HashTable();
function HashTable(obj)
{
    this.length = 0;
    this.items = {};
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            this.items[p] = obj[p];
            this.length++;
        }
    }

    this.setItem = function(key, value)
    {
        var previous = undefined;
        if (this.hasItem(key)) {
            previous = this.items[key];
        }
        else {
            this.length++;
        }
        this.items[key] = value;
        return previous;
    }

    this.getItem = function(key) {
        return this.hasItem(key) ? this.items[key] : undefined;
    }

    this.hasItem = function(key)
    {
        return this.items.hasOwnProperty(key);
    }
   
    this.removeItem = function(key)
    {
        if (this.hasItem(key)) {
            previous = this.items[key];
            this.length--;
            delete this.items[key];
            return previous;
        }
        else {
            return undefined;
        }
    }

    this.keys = function()
    {
        var keys = [];
        for (var k in this.items) {
            if (this.hasItem(k)) {
                keys.push(k);
            }
        }
        return keys;
    }

    this.values = function()
    {
        var values = [];
        for (var k in this.items) {
            if (this.hasItem(k)) {
                values.push(this.items[k]);
            }
        }
        return values;
    }

    this.each = function(fn) {
        for (var k in this.items) {
            if (this.hasItem(k)) {
                fn(k, this.items[k]);
            }
        }
    }

    this.clear = function()
    {
        this.items = {}
        this.length = 0;
    }
}
// 1. Echo sockjs server
var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};
var broadcast = {};
function Stock() {
	var name;
	var lastprice;
	var high;
	var low;
	var prvclose;
	var change;
	var pergain;
	var recommended = false;
}
setTimeout(function schedule() {
	console.log('    [+] schedule ');
	new YQL.exec("select * from html where url=\"http://www.moneycontrol.com/stocks/marketstats/nsegainer/index.html\" and xpath='//table[@class=\"tbldata14 bdrtpg\"]'", function(response) {
		var html;
		if (response.error) {
			console.log("Example #1... Error: " + response.error.description);
			html=response.error.description;
		} else {
			html = format(response.query.results.table);
		}
		//console.log(html);
		for(var id in broadcast) {
			broadcast[id].write(html);
		}
		setTimeout(schedule, schedultime);
	});
}, schedultime);

function format(table) {
	var hashtable = new HashTable()
	var html ='<table>'
	html = html + '<tr>';
	html = html + '<th><b>Company Name</b></th>';
	html = html + '<th><b>High</b></th>';
	html = html + '<th><b>Low</b></th>';
	html = html + '<th><b>Last Price</b></th>';
	html = html + '<th><b>Prv Close</b></th>';
	html = html + '<th><b>Change</b></th>';
	html = html + '<th><b>PerGain</b></th>';
	html = html + '<th><b>Recommendation</b></th>';
	html = html + '</tr>';
	for (var i=1; i<table.tr.length; i++) {
		var stock = new Stock();
		var tr = table.tr[i];
		html = html + '<tr>';
		html = html + '<td>' + tr.td[0].a.title +'</td>';
		stock.title = tr.td[0].a.title;
		stock.high = tr.td[1].p;
		stock.low = tr.td[2].p;
		stock.lastprice = tr.td[3].p;
		stock.prvclose = tr.td[4].p;
		stock.change = tr.td[5].p;
		stock.pergain = tr.td[6].p;
		var rank = ((stock.high - stock.lastprice)/stock.lastprice)*100;
		for (var j=1; j<tr.td.length; j++) {
			html = html + '<td>' + tr.td[j].p +'</td>';
		}
		if(stock.pergain > 2 &&  rank < 1 && (!oldhashtable.hasItem(stock.title) || !oldhashtable.getItem(stock.title).recommended)) {
			console.log('Got Recommendation: '+stock.title+' With Rank: '+rank);
			html = html + '<td>Strong Sell</td>';
			stock.recommended = true;
		} else {
			html = html + '<td></td>';
			stock.recommended = false;
		}
		html = html + '</tr>';
		hashtable.setItem(stock.title, stock);
	}
	oldhashtable = hashtable;
	console.log('No of stocks: '+hashtable.length);
	html = html + '</table>';
	return html
}

var sockjs_echo = sockjs.createServer(sockjs_opts);
sockjs_echo.on('connection', function(conn) {
        console.log('    [+] broadcast open ' + conn);
        broadcast[conn.id] = conn;
        conn.on('close', function() {
            delete broadcast[conn.id];
            console.log('    [-] broadcast close' + conn);
        });
        conn.on('data', function(m) {
            console.log('    [-] got message', m);
        });
});


// 3. Usual http stuff
var server = http.createServer();


sockjs_echo.installHandlers(server, {prefix:'/echo'});

console.log(' [*] Listening on 0.0.0.0:9999' );
server.listen(9999, '0.0.0.0');
