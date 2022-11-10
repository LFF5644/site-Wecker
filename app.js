const {
	init,
	node,
	node_dom,
	node_map,
	hook_dom,
	hook_model,
	hook_effect,
}=lui;

const audio_ring="https://lff.l3p3.de/files/sounds/alarmOldWecker.mp3";
const entryTemplate={
	id:0,
	name:"demo",
	time:"12:00",
	isRinging:false,
	lastRingDay:0,
	disabled:false,
	color:"#ffffff",
	ringEveryDay:true,
	ringDays:[
		true,	//Montag;
		true,	//Dienstag;
		true,	//Mittwoch;
		true,	//Donnerstag;
		true,	//Freitag;
		false,	//Samstag;
		false,	//Sonntag;
	],
	ringMode:[
		true,	//Ton;
		false, 	//Vibrate;
		true,	//Notify;
	],
}
const dayNames=[
	"Montag",
	"Dienstag",
	"Mittwoch",
	"Donnerstag",
	"Freitag",
	"Samstag",
	"Sonntag",
];
const ringModeNames=[
	"Ton",
	"Vibrate",
	"Notify",
];

const model={
	init:()=>{
		const entries=localStorage.getItem("wecker_entries");
		const state={
			editing:-1,
			entries:(
				entries
				?	JSON.parse(entries).map(item=>({
						...entryTemplate,
						...item,
					}))
				:	[{
						...entryTemplate,
						id:Date.now(),
					}]
			),
		};
		return state;
	},
	addEntry:(state,changes={})=>({
		...state,
		entries:[
			...state.entries,
			{
				...entryTemplate,
				id:Date.now(),
				...changes,
			},
		],
	}),
	removeEntry:(state,itemId)=>({
		...state,
		entries:(
			state.entries
			.filter(item=>item.id!==itemId)
		),
	}),
	saveEntries:state=>{
		if(typeof(state.entries)!=="object"){return state;}
		localStorage.setItem("wecker_entries",JSON.stringify(state.entries));
		return state;
	},
	editEntryUI:(state,itemId)=>({
		...state,
		editing:itemId,
	}),
	editEntry:(state,[itemId,changes])=>({
		...state,
		entries:(
			state.entries
			.map(item=>
				item.id!==itemId?item:{...item,...changes}
			)
		),
	}),
};

function notify({
	title,
	text,
	icon,
	image,
	onclick,
	onclose,
}){
	if(Notification.permission==="denied"){return;}
	const msg=new Notification(title,{
		body:text,
		requireInteraction:true,
	});
	msg.onclick=onclick;
	msg.onclose=onclose;
}

function Ringer({
	I:{
		id,
		name,
		time,
		isRinging,
		ringMode,
	},
	actions,
}){
	const player=hook_dom('audio[loop]',{src:audio_ring});
	hook_effect(()=>{
		if(isRinging){
			if(ringMode[0]){// Ton;
				player.currentTime=0;
				player.play();
			}
			if(ringMode[1]){// Vibrate;
				navigator.vibrate(1e3*2);
			}
			if(ringMode[2]){// Notify;
				notify({
					title:name,
					text:`Wecker ${name} klingelt, es ist ${time}`,
					onclick:()=>{
						console.log("MSG.onclick();");
						actions.editEntryUI(-1);
					},
					onclose:()=>{
						console.log("MSG.onclose();");
						actions.editEntry([
							id,
							{isRinging:false},
						]);
					},
				});
			}
		}
		else{
			player.pause();
		}
	},[isRinging]);
	return null;
}

function IndexEntry({
	I:{
		id,
		name,
		time,
		isRinging,
		disabled,
		color,
	},
	actions,
}){
	return[
		node_dom("tr",{
				F:{
					ringing:isRinging,
					disabled,
				},
			},
			[
				node_dom("td",{innerText:name}),
				node_dom("td",{innerText:time}),
				node_dom("td",{
					S:{
						backgroundColor:color,
					},
				},
				[
					node_dom("button[innerText=DEL][className=delete]",{
						onclick:()=>{
							actions.removeEntry(id);
						},
					}),
					node_dom("button[innerText=EDIT][className=edit]",{
						onclick:()=>{
							actions.editEntryUI(id);
						},
					}),
					isRinging&&
					node_dom("button[innerText=STOPP!][className=stop]",{
						onclick:()=>{
							actions.editEntry([id,{isRinging:false}]);
						},
					}),
				]),
			]),
	];
}
function ScreenMain({entries,actions}){
	const createEntry=()=>{
		const id=Date.now();
		actions.addEntry({id});
		actions.editEntryUI(id);
	};
	return [
		node_dom("h1[innerText=Wecker]"),
		
		entries.length>0&&
		node_dom("table[border=3px][width=100%]",null,[
			node_dom("tr",null,[
				node_dom("th[innerText=Name]"),
				node_dom("th[innerText=Uhrzeit]"),
				node_dom("th[innerText=Aktionen]"),
			]),

			node_map(IndexEntry,entries,{actions}),
		]),

		entries.length===0&&
		node_dom("p",null,[
			node_dom("span[innerText=Keine Wecker vorhanden, ]"),
			node_dom("a[innerText=Wecker jetzt erstellen!][href=#]",{
				onclick:createEntry,
			}),
		]),
		node_dom("button[innerText=+][title=Wecker hinzufügen]",{
			onclick:createEntry,
		}),
	];
}
function ScreenEditing({entry,actions}){
	return[
		node_dom("h1",{innerText:`Wecker "${entry.name}" bearbeiten`}),
		node_dom("p",null,[
			node_dom("label",null,[
				node_dom("span[innerText=Wecker-Name: ]"),
				node_dom("input",{
					value:entry.name,
					oninput:event=>{
						actions.editEntry([entry.id,{
							name:event.target.value,
							lastRingDay:0,
						}]);
					},
				}),
			]),
		]),
		node_dom("p",null,[
			node_dom("label",null,[
				node_dom("span[innerText=Wecker-Zeit: ]"),
				node_dom("input",{
					value:entry.time,
					oninput:event=>{
						actions.editEntry([entry.id,{
							time:event.target.value,
							lastRingDay:0,
						}]);
					},
				}),
			]),
		]),
		node_dom("p",null,[
			node_dom("label",{title:`Wecker ist derzeit ${entry.disabled?'aus':'an'}`},[
				node_dom("span[innerText=Wecker einschalten ]"),
				node_dom("input[type=checkbox]",{
					checked:!entry.disabled,
					oninput:event=>{
						actions.editEntry([entry.id,{
							disabled:!event.target.checked,
							lastRingDay:0,
						}]);
					},
				}),
			]),
		]),
		node_dom("p",null,[
			node_dom("label",null,[
				node_dom("span[innerText=Wecker-Farbe ]"),
				node_dom("input[type=color]",{
					value:entry.color,
					oninput:event=>{
						actions.editEntry([entry.id,{
							color:event.target.value,
							lastRingDay:0,
						}]);
					}
				}),
			]),
		]),
		node_dom("p",null,[
			node_dom("label",{title:`Wecker klingelt jetzt ${entry.ringEveryDay?'jeden':'manchen'} Tag`},[
				node_dom("span[innerText=Jeden Tag klingeln ]"),
				node_dom("input[type=checkbox]",{
					checked:entry.ringEveryDay,
					oninput:event=>{
						actions.editEntry([entry.id,{
							ringEveryDay:event.target.checked,
							lastRingDay:0,
						}]);
					},
				}),
			]),
		]),
		!entry.ringEveryDay&&
		node_dom("fieldset",null,[
			node_dom("legend[innerText=Wochentage]"),
			...dayNames.map((day,index)=>
				node_dom("p",null,[
					node_dom("label",null,[
						node_dom(`span[innerText=${day} ]`),
						node_dom("input[type=checkbox]",{
							checked:entry.ringDays[index],
							oninput:event=>{
								actions.editEntry([entry.id,{
									ringDays:entry.ringDays.map((item,i)=>
										i!==index
										?	item
										:	event.target.checked
									),
									lastRingDay:0,
								}]);
							},
						}),
					]),
				])
			),
		]),
		node_dom("fieldset",null,[
			node_dom("legend[innerText=Klingel-Optionen]"),
			...ringModeNames.map((name,index)=>
				node_dom("p",null,[
					node_dom("label",null,[
						node_dom(`span[innerText=${name} ]`),
						node_dom("input[type=checkbox]",{
							checked:entry.ringMode[index],
							oninput:event=>{
								actions.editEntry([entry.id,{
									ringMode:entry.ringMode.map((item,i)=>
										i!==index
										?	item
										:	event.target.checked
									),
									lastRingDay:0,
								}]);
							},
						}),
					]),
				])
			),
		]),

		node_dom("button[innerText=Zurück][className=back]",{
			onclick:()=>{
				actions.editEntryUI(-1);
			},
		}),

	];
}
function checkSave(entries,actions){
	const clearSaveInterval=()=>{try{clearInterval(interval)}catch(e){}};
	const interval=setInterval(()=>{
		console.log("deine Wecker werden gespeichert...");
		actions.saveEntries();
		clearSaveInterval();
	},2e3);
	return clearSaveInterval;
}
const checkEntriesEffect=(entries,actions)=>{
	const interval=setInterval(()=>{
		console.log("check for ring...")
		const date=new Date();
		const msPerDay=24*60*60*1000;
		const weekDay=(date.getDay()+6)%7;
		const time=[
			date.getHours(),
			date.getMinutes(),
		];
		const thisDayTime=date.getTime()%msPerDay;
		const thisDay=date.getTime()-thisDayTime;

		for(entry of entries){
			let [hour,minute]=entry.time.split(":");
			hour=Number(hour);
			minute=Number(minute);
			if(
				hour===time[0]&&
				minute===time[1]&&
				entry.lastRingDay<thisDay&&
				!entry.disabled&&
				(
					entry.ringEveryDay||
					entry.ringDays[weekDay]
				)
				//TODO check wecker on and correct day;
			){
				actions.editEntry([entry.id,{
					isRinging:true,
					lastRingDay:thisDay,
				}]);
				
				// if entry ring;

			}
		}
	},5000);
	return ()=>clearInterval(interval);
}

Notification.requestPermission();

init(()=>{
	const [
		{entries,editing},
		actions,
	]=hook_model(model);
	hook_effect(checkSave,[entries,actions]);
	hook_effect(checkEntriesEffect,[entries,actions]);
	

	return[
		null,
		[
			editing===-1&&
			node(ScreenMain,{actions,entries}),

			editing!==-1&&
			node(ScreenEditing,{
				actions,
				entry:entries.find(item=>item.id===editing),
			}),
			node_map(Ringer,entries,{actions}),
		],
	];
});
