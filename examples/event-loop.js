'use strict';
const http = require('http');
const libui = require('..');

let setIntervalHandle = null;
let lastTimeout = 0;
let setIntervalLast = Date.now();

const win = new libui.UiWindow('Event loop tests', 800, 600, false);
win.margined = 1;

const box = new libui.UiVerticalBox();
box.padded = true;
win.setChild(box);

const setIntervalMs = new libui.UiSlider(0, 1000);
setIntervalMs.onChanged(setIntervalChanged);
setIntervalMs.value = 0;

const form = new libui.UiForm();
form.padded = true;
form.append('setInterval', setIntervalMs, 0);
form.append('actions', makeToolbar(), 0);
box.append(form, true);

const log = new libui.UiMultilineEntry();
box.append(log, true);

let server = null;

win.onClosing(() => {
	if (setIntervalHandle !== null) {
		clearInterval(setIntervalHandle);
		setIntervalHandle = null;
	}
	if (server) {
		console.log('Closing server');
		server.close();
		server = null;
	}
	win.close();
	libui.stopLoop();
	setTimeout(() => console.log('after stopLoop'), 100);
});

win.show();
libui.startLoop();

function logAppend(line) {
	const lines = log.text.split('\n');
	if (lines.length > 20) {
		log.text = lines.slice(1).join('\n');
	}
	log.append(line + '\n');
}

function setIntervalChanged() {
	const ms = setIntervalMs.value;
	if (Math.abs(ms - lastTimeout) < 100) {
		return;
	}
	lastTimeout = ms;
	if (setIntervalHandle !== null) {
		clearInterval(setIntervalHandle);
		setIntervalHandle = null;
	}

	if (ms > 0) {
		setIntervalHandle = setInterval(() => {
			const now = Date.now();
			const elapsed = now - setIntervalLast;
			logAppend(`setInterval:${now} - elapsed ${elapsed} ms`);
			setIntervalLast = now;
		}, ms);
	}
}

function makeToolbar() {
	const toolbar = new libui.UiHorizontalBox();
	toolbar.padded = true;

	const btnSetImmediate = new libui.UiButton('setImmediate');
	btnSetImmediate.onClicked(() => {
		const now = Date.now();
		setImmediate(() => {
			const elapsed = Date.now() - now;
			logAppend(`setImmediate:${now} - elapsed ${elapsed} ms`);
		});
	});

	toolbar.append(btnSetImmediate, false);

	const btnPromise = new libui.UiButton('Promise');
	btnPromise.onClicked(() => {
		const now = Date.now();

		Promise.resolve(true).then(() => {
			const elapsed = Date.now() - now;
			logAppend(`Promise: ${now} - elapsed ${elapsed} ms`);
		});
	});

	toolbar.append(btnPromise, false);

	const btnCustom = new libui.UiButton('Custom setTimeout');
	btnCustom.onClicked(() => {
		const now = Date.now();

		setTimeout((a, b, c) => {
			const elapsed = Date.now() - now;
			logAppend(`Custom setTimeout: ${now} - elapsed ${elapsed} ms. Args: ${a} ${b} ${c}`);
		}, 10, 'custom', 'args', 2);
	});
	toolbar.append(btnCustom, false);

	const btnCustomSetInterval = new libui.UiButton('Custom setInterval');
	let intervalHandler = null;
	btnCustomSetInterval.onClicked(() => {
		if (intervalHandler) {
			clearInterval(intervalHandler);
			intervalHandler = null;
			return;
		}
		let now = Date.now();
		intervalHandler = setInterval((a, b, c) => {
			const elapsed = Date.now() - now;
			logAppend(`Custom setInterval: ${now} - elapsed ${elapsed} ms. Args: ${a} ${b} ${c}`);
			now = Date.now();
		}, 50, 'my', 'args', 2);
	});

	toolbar.append(btnCustomSetInterval, false);

	const btnNextTick = new libui.UiButton('NextTick');
	btnNextTick.onClicked(() => {
		const now = Date.now();
		process.nextTick(() => {
			const elapsed = Date.now() - now;
			logAppend(`nextTick:${now} - elapsed ${elapsed} ms`);
		});
	});

	toolbar.append(btnNextTick, false);

	const btnReadFile = new libui.UiButton('ReadFile');
	btnReadFile.onClicked(() => {
		const createReadStream = require('fs').createReadStream;
		const stream = createReadStream('/tmp/big');
		let i = 0;
		stream.on('data', data => {
			logAppend(`ReadFile: chunk ${i++} - ` + data.length);
		});
	});
	toolbar.append(btnReadFile, false);

	const btnHttp = new libui.UiButton('Http');

	btnHttp.onClicked(() => {
		let i = 0;
		if (server) {
			server.close();
			server = null;
			logAppend('server closed.');
			return;
		}
		server = http.createServer((req, res) => {
			console.log('******** Connessione...')
			res.writeHead(200, {'Content-Type': 'text/plain'});
			logAppend(`Http: request ${i}`);
			res.end(String(i++));
		});

		server.listen(8300, '127.0.0.1', () => {
			console.log('******** listeining...')
			logAppend('listening...');
		});
	});

	toolbar.append(btnHttp, false);

	return toolbar;
}
