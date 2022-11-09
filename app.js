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
}
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
	saveEntries:(state)=>{
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
function Ringer({I:{isRinging}}) {
	const player=hook_dom('audio[loop]',{src:audio_ring});
	hook_effect(()=>{
		if(isRinging){
			player.currentTime=0;
			player.play();
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
				node_dom("td",null,[
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
		const name=prompt("Wecker-Name:")||"no Name";
		const time=prompt("Wecker-Zeit:")||"00:00";
		actions.addEntry({
			name,
			time,
		});
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
				node_dom("span[innerText=Wecker einschalten]"),
				node_dom("input[type=checkbox]",{
					checked:!entry.disabled,
					oninput:(event)=>{
						actions.editEntry([entry.id,{
							disabled:!event.target.checked,
							lastRingDay:0,
						}]);
					},
				}),
			]),
		]),

		node_dom("button[innerText=Zurück][className=back]",{
			onclick:()=>{
				actions.editEntryUI(-1);
			},
		}),

	];
}
const checkEntriesEffect=(entries,actions)=>{
	const interval=setInterval(()=>{
		console.log("check for ring...")
		const date=new Date();
		const msPerDay=24*60*60*1000;
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
				entry.disabled===false
				//TODO check wecker on and correct day;
			){
				actions.editEntry([entry.id,{
					isRinging:true,
					lastRingDay:thisDay,
				}]);
				
				//alert(`ALARM! es ist ${entry.time} es klingelt wecker "${entry.name}"`);
				
			}
		}
	},5000);
	return ()=>clearInterval(interval);
}

init(()=>{
	const [
		{entries,editing},
		actions,
	]=hook_model(model);
	hook_effect(actions.saveEntries,[entries]);
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
			node_map(Ringer,entries),
		],
	];
});
