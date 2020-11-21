function createNote(keyId) {
	QDEB&&console.debug(`createNote(${keyId})`);
	if(Prefs.storageOption === 'ext'){
		return new QNote(keyId);
	} else if(Prefs.storageOption === 'folder'){
		return new QNoteFolder(keyId, Prefs.storageFolder);
	} else {
		throw new TypeError("Ivalid Prefs.storageOption");
	}
}

async function getQAppNoteData(keyId) {
	return loadNote(keyId).then(note => {
		return note2QAppNote(note);
	});
}

async function loadNote(keyId) {
	let note = createNote(keyId);
	return note.load().then(() => note);
}

async function loadAllNotes() {
	let p;
	if(Prefs.storageOption === 'ext'){
		p = browser.storage.local.get(null).then(storage => {
			let keys = [];
			for(let keyId in storage){
				if(keyId.substr(0, 5) !== 'pref.') {
					keys.push({
						keyId: keyId
					});
				}
			}
			return keys;
		});
	} else if(Prefs.storageOption === 'folder'){
		p = Promise.all([
			browser.xnote.getAllNotes(Prefs.storageFolder),
			browser.qnote.getAllNotes(Prefs.storageFolder)
		]).then(values => {
			return Object.assign(values[0], values[1]);
		});
	} else {
		throw new TypeError("Ivalid Prefs.storageOption");
	}

	return p.then(async keys => {
		let Notes = [];
		for(let k of keys){
			loadNote(k.keyId).then(note => {
				Notes.push(note);
			});
		}

		return Notes;
	});
}

// Prepare note for sending to qapp
function note2QAppNote(note){
	return note ? {
		keyId: note.keyId,
		exists: note.exists || false,
		text: note.text || "",
		ts: note.ts || 0,
		tsFormatted: getNoteFormattedTitle(note.ts)
	} : null;
}

async function loadAllQAppNotes(){
	return loadAllNotes().then(notes => {
		for(let note of notes){
			sendNoteToQApp(note);
		}
	});
}

function sendNoteToQApp(note){
	return browser.qapp.saveNoteCache(note2QAppNote(note));
}

function getNoteFormattedTitle(ts){
	if(Prefs.dateFormatPredefined){
		return dateFormatPredefined(CurrentLang, Prefs.dateFormatPredefined, ts);
	} else {
		if(Prefs.dateFormat){
			return dateFormat(CurrentLang, Prefs.dateFormat, ts);
		} else {
			return dateFormatPredefined(CurrentLang, 'DATETIME_FULL_WITH_SECONDS', ts);
		}
	}
}
