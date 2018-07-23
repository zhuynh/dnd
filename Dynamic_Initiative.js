/**
 * !ihelp - image of commands
 * !i [arguments] - add selected character to initiative
 * !icheck - whispers selected actions
 */

 /**
  * Integrate Turn Maker
  * Find and Replace iTracker
  * Turn Maker Clickable for players
  * Display current players choosens actions
  * display end of round
  */
var icommand = {
    move: {
        name: 'Move',
        key: 'w',
        diesize: 'd4',
    },
    rangedattack: {
        name: 'Ranged Weapon',
        key: 'r',
        diesize: 'd6',
    },
    meleeattack: {
        name: 'Melee Weapon',
        key: 'm',
        diesize: 'd8',
    },
    castspell: {
        name: 'Cast a spell',
        key: 's',
        diesize: 'd10',
    },
    swapgear: {
        name: 'Swap Gear',
        key: 'x',
        diesize: 'd4',
    },
    otheraction: {
        name: 'Other Action',
        key: 'o',
        diesize: 'd4',
    },
    advantage: {
        name: 'Advantage',
        key: 'a',
        //diesize: 'd4',
    },
    disadvantage: {
        name: 'Disadvantage',
        key: 'd',
        //diesize: 'd4',
    },
};


var actionstypes = [
	// "a" = advantage
	// "d" = disadvantage
	["w", 4, "Move"],
	["r", 6, "Ranged Attack"],
	["m", 8, "Melee Attack"],
	["s", 10, "Spell"],
	["x", 4, "Swap Gear"],
    ["o", 4, "Other"],
    ["trivial", 0, "trivial"],
    ["easy", 4, "easy"],
    ["medium", 6, "medium"],
    ["hard", 8, "hard"],
    ["deadly", 10, "deadly"]
];

var initiative_hold = [];
var character_tokens = [];

on("ready", function () {
	// get all character tokens
	getCharacterTokens();

	//TURN MARKER
	'use strict';
	TurnMarker.CheckInstall(); 
	TurnMarker.RegisterEventHandlers();
});

function getCharacterTokens(){
	var tokens = findObjs({type:'graphic',isdrawing:false});
	var characters = findObjs({type:'character'});
	
	characters = _.filter(characters,(c)=>{
		return c.get('controlledby') && c.get('controlledby')!==''
	});
	tokens = _.filter(tokens,(t)=>{
		return (t.get('controlledby') && t.get('controlledby')!== '') || _.some(characters,(c)=>{
			return c.id === t.get('represents')
		})
    });
    
	// log('Player controlled Tokens: '+ JSON.stringify(tokens));
	 var character_tokens = []
	_.each(tokens, function(token) {
		character_tokens.push([token.get('name').toLowerCase(), token.get('_id')]);
		//character_tokens.push(token.get('name');
	});
	// log("Character Tokens: "+character_tokens.toString());
}

// [msg.who, selected._id, initdice, obj]
function startRound() {

	if (initiative_hold[0] !== null) {

		// iterate over combatants
		_.each(initiative_hold, function (combatant) {
			//log("Adding '" + combatant[0] + "' - ID:" + combatant[1] + " to tracker");
			// TODO: sendChat to calculate before sending results
			var dicetext = allocateDice(combatant[2]);

			// roll for characters
			sendChat("character|" + combatant[3].get("represents"), " rolled [[" + dicetext + " ]] for initiative!", function (ops) {

                var total = getRollResult(ops[0]);
				//log("OPS: " + total)

				var curturnorder = [];

				if(Campaign().get("turnorder") == "") {
					curturnorder.push({
						id: combatant[1],
						pr: total + ".1",
					});
				}
				else {
					//TODO: Get turnorder, find and replace, then set
					curturnorder = JSON.parse(Campaign().get("turnorder"));
					
					//removes current initative of character from active turn order
					for( var i = 0; i < curturnorder.length; i++ ) {
						//log("Debug: Loop | "+curturnorder[i][0])
						if( curturnorder[i].id === combatant[1] ) {
							//log("Debug: "+"found: "+combatant[1])
							curturnorder.splice(i,1);
							i--;
						}
					}

					curturnorder.push({
						id: combatant[1],
						pr: total + ".1",
					});

					// sort in ascending order, smalles to largest
					curturnorder.sort(function (a, b) {
						first = a.pr;
						second = b.pr;

						return first - second;
					});
				}

				Campaign().set("turnorder", JSON.stringify(curturnorder));
				//sendChat("character|" + combatant[3].get("represents"), " rolled init: " + total + "");
				sendChat(combatant[3].get('name'), " rolled init: " + total + "");

			});

		});

	}
}

function addCreatureToInitiative(msg) {
	//log("Recieved Message: " + msg.content + " from: " + msg.who);

	try {
		// Iterate over selected tokens
		_.each(msg.selected, function (selected) {

			var obj = getObj("graphic", selected._id);
			var currChar = getObj("character", obj.get("represents")) || "";

			// Initiative for Character
			if (currChar.length != 0) {
                var initdice = [];
                var args = msg.content.split(/\s+/);

                // DIFFICULTY
                if (args[1] != null){
                    log("Monster args: "+ args[1] +", "+ args[2]);
                    for (j = 0; j < actionstypes.length; j++) {

                        if (args[2].toLowerCase() == actionstypes[j][0]) {
                            // # of dice, Size, Type of Action, BA/A
                            log("pushed monster onto init:" + actionstypes[j][1] + ", " + actionstypes[j][2])
                            initdice.push([1, actionstypes[j][1], actionstypes[j][2], "Monster"]);
                        }
                    }
                }

				// Sort Dice
				initdice = initdice.sort(sortFunction);

				// ADD INITDICE ARRAY TO TRACKER
				// Replace any existing
				var existing_Combatant_Index = getIndexOfK(initiative_hold,selected._id);
                if(existing_Combatant_Index != null) {
					initiative_hold[existing_Combatant_Index] = [msg.who, selected._id, initdice, obj];
				} else {
					initiative_hold.push([msg.who, selected._id, initdice, obj]);
                }
                log("Added Monster: " + obj.get('name'));
                // log(printCombatantActions(initdice));

                //send confirmation to chat window? or whisper to individual player to free screen
                // sendChat(obj.get('name'), printCombatantActions(initdice));
                
                //obj.get('name') = tokens display name
				//currChar.get('name') = tokens linked charactersheet name

			}
			// TODO: Initiative for NPC
			else {
				sendChat(obj.get("name"), "NPC rolling for initiative! WIP...");
			}
		});
	} catch (err) { return; }
	// end token iteration
}

function addCharacterToInitiative(msg) {
	//log("Recieved Message: " + msg.content + " from: " + msg.who);

	try {
		// Iterate over selected tokens
		_.each(msg.selected, function (selected) {

			var obj = getObj("graphic", selected._id);
			var currChar = getObj("character", obj.get("represents")) || "";

			// Initiative for Character
			if (currChar.length != 0) {
                var initdice = [];
                var args = msg.content.split(/\s+/);

                // ACTIONS
                if (args[1] != null){
                    log("arge[1]: "+args[1]);
                    var inittext_actions = remove_duplicate_characters(args[1]).replace(/\s/g, '').split('');

                    // iterate over each action parameter in the message
                    for (i = 0; i < inittext_actions.length; i++) {

                        // replace each action parameter with dice value
                        for (j = 0; j < actionstypes.length; j++) {

                            if (inittext_actions[i].includes(actionstypes[j][0])) {
                                // # of dice, Size, Type of Action, BA/A
                                initdice.push([1, actionstypes[j][1], actionstypes[j][2], "Action"]);
                                //log("Added: " + actionstypes[j][2]);
                            }
                        }
                    }
                }

                // BONUS ACTIONS
                if (args[2] != null){
                    log("arge[2]: "+args[1]);
                    var inittext_bonusactions = remove_duplicate_characters(args[2]).replace(/\s/g, '').split('');
                    // iterate over each bonus action parameter in the message
                    for (i = 0; i < inittext_bonusactions.length; i++) {

                        // replace each action parameter with dice value
                        for (j = 0; j < actionstypes.length; j++) {

                            if (inittext_bonusactions[i].includes(actionstypes[j][0])) {
                                // # of dice, Size, Type of Action, BA/A
                                initdice.push([1, actionstypes[j][1], actionstypes[j][2], "Bonus"]);
                                //log("Added: " + actionstypes[j][2]);
                            }
                        }
                    }
                }

				// Sort Dice
				initdice = initdice.sort(sortFunction);

				// DETERMINE ADVANTAGE / DISADVANTAGE
				if (inittext_actions.includes('a') && inittext_actions.includes('d')) {
					// do nothing, advantage and disadvantage cancel out
				} else if (inittext_actions.includes('a')) {
					initdice[0][0] = 2
				} else if (inittext_actions.includes('d')) {
					initdice[0][0] = -2
				}

				// ADD INITDICE ARRAY TO TRACKER
				// Replace any existing
				var existing_Combatant_Index = getIndexOfK(initiative_hold,selected._id);
                if(existing_Combatant_Index != null) {
					initiative_hold[existing_Combatant_Index] = [msg.who, selected._id, initdice, obj];
				} else {
					initiative_hold.push([msg.who, selected._id, initdice, obj]);
                }
                log("Added Combatant: " + obj.get('name'));
                log(printCombatantActions(initdice));

                //send confirmation to chat window? or whisper to individual player to free screen
                sendChat(obj.get('name'), printCombatantActions(initdice));
                
                //obj.get('name') = tokens display name
				//currChar.get('name') = tokens linked charactersheet name

			}
			// TODO: Initiative for NPC
			else {
				sendChat(obj.get("name"), "NPC rolling for initiative! WIP...");
			}
		});
	} catch (err) { return; }
	// end token iteration
}

// [1, actionstypes[j][1], actionstypes[j][2]]
function allocateDice(diceset) {
	// sort dice in descending order by Dice Size, 2nd column
    var dicetext = ""
    var dicetemp = [];
	_.each(diceset, function (dice) {
        // # of dice, Size, Type of Action, BA/A
        switch (dice[3]){
            case "Action":
                switch (dice[2]){
                    case "Move":
                        dicetemp[0] = dice;
                        break;
                    case "Swap Gear":
                        dicetemp[3] = dice;
                        break;
                    default:
                        dicetemp[1] = dice;

                }
                break;
            case "Bonus":
                if(dicetemp[2] == null || dicetemp[2][1] < dice[1])
                    dicetemp[2] = dice;
                break;
            case "Monster": {
                    log("Made it!");
                    dicetemp[0] = dice;
                    dicetemp[1] = [1, 4, "base", "Monster"];
                }
                break;
            default:
                break;
        }
    });
    
    // replace action die with bonus action die if bonus action is larger
    if(dicetemp[1] != null && dicetemp[2] != null && dicetemp[2][1] > dicetemp[1][1]){
        dicetemp[1] = dicetemp[2];
    }
    // replace action die with bonus action die if there is no action die 
    else if (dicetemp[1] == null && dicetemp[2] != null) {
        dicetemp[1] = dicetemp[2];
    }
    dicetemp[2] = null;

    log("made it two");
	_.each(dicetemp, function (dice) {
        log("made it three");
        if(dice != null) {
            switch (dice[0]) {
                case -2:
                    dicetext = dicetext + Math.abs(dice[0]) + "d" + dice[1] + "k1";
                    break;
                case 2:
                    dicetext = dicetext + Math.abs(dice[0]) + "d" + dice[1] + "kl1";
                    break;
                default:
                    dicetext = dicetext + dice[0] + "d" + dice[1];
                    break;
            }
            dicetext = dicetext + " + ";
        }
    });
    log("dicetext: "+ dicetext);
	return dicetext;
}

function sortFunction(a, b) {
	if (a[1] === b[1]) {
		return 0;
	}
	else {
		return (a[1] < b[1]) ? 1 : -1;
	}
}

function remove_duplicate_characters(str) {
    var result = '';
    for(var i = 0; i < str.length; i++) {
      if(result.indexOf(str[i]) < 0) {
        result += str[i];
      }
    }
    return result;
}

function getIndexOfK(arr, k) {
	if (!arr){
		return null;
	}

	for (var i = 0; i < arr.length; i++) {
		var index = arr[i].indexOf(k);
		if (index > -1) {
			return i;
		}
	}

	return null;
}

function getRollResult(msg) {
	//log("Obtaining roll result...")
	if (_.has(msg, 'inlinerolls')) {
		msg.content = _.chain(msg.inlinerolls)
			.reduce(function (m, v, k) {
				m['$[[' + k + ']]'] = v.results.total || 0;
				return m;
			}, {})
			.reduce(function (m, v, k) {
				return m.replace(k, v);
			}, msg.content)
			.value();

		//log("result:" + msg.content)
		return msg.content.replace(/\D/g, '');
	}
}

function printCombatantActions(arr){
    var actions = [];
    var bonus_actions = [];
	_.each(arr, function(action){
        if(action[3] == "Action") {
            actions.push(action[2]);
        }
        else {
            bonus_actions.push(action[2]);
        }
    });

    /**
     * Example format for '!i mrx b'
     * Actions: Move, Ranged, Swap
     * Bonus Actions: Ranged
     */
	return "\n Actions: " + actions.join(", ") + "\n" + "Bonus Actions: " + bonus_actions.join(", ");
}

function printCombatantActionsHtml(arr){
    var actions = [];
    var bonus_actions = [];
    var isMonster = false;
    log("here");
	_.each(arr, function(action){
        log("print: " + action[0] + " | " +  action[1] + " | " +  action[2] + " | " + action[3])
        if(action[3] == "Action") {
            actions.push(action[2]);
        }
        else if (action[3] == "Monster") {
            isMonster = true;
        } else {
            bonus_actions.push(action[2]);
        }
    });

    if (isMonster) {
        return "";
    }
    /**
     * Example format for '!i mrx b'
     * Actions: Move, Ranged, Swap
     * Bonus Actions: Ranged
     */
	return "<b>Actions:</b> " + actions.join(", ") + "<br>" + "<b>Bonus Actions:</b> " + bonus_actions.join(", ");
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Github:   https://github.com/shdwjk/Roll20API/blob/master/TurnMarker1/TurnMarker1.js
// By:       The Aaron, Arcane Scriptomancer
// Contact:  https://app.roll20.net/users/104025/the-aaron

/* global GroupInitiative:false Mark:false */
/*  ############################################################### */
/*  TurnMarker */
/*  ############################################################### */
state.TurnMarker = {
    //version: schemaVersion,
    announceRounds: true,
    announceTurnChange: true,
    announcePlayerInTurnAnnounce: true,
    announcePlayerInTurnAnnounceSize: '100%',
    autoPull: 'none',
    autoskipHidden: true,
    tokenName: 'Round',
    tokenURL: 'https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580',
    playAnimations: false,
    rotation: false,
    animationSpeed: 5,
    scale: 1.7,
    aura1: {
        pulse: false,
        size: 5,
        color: '#ff00ff'
    },
    aura2: {
        pulse: false,
        size: 5,
        color: '#00ff00'
    }
};


var TurnMarker = TurnMarker || (function(){
    "use strict";
    
    var version = '1.3.9',
        lastUpdate = 1500408657,
        schemaVersion = 1.17,
        active = false,
        threadSync = 1,
        autoPullOptions = {
            'none' : 'None',
            'npcs' : 'NPCs',
            'all'  : 'All'
        },

    fixedSendPing = (function(){
        var last={};
        return function(left,top,pageid,playerid,pull){
            if( last.left   === left   &&
                last.top    === top    &&
                last.pageid === pageid ) {
                sendPing(-100,-100,pageid,null,false);
            }
            sendPing(left,top,pageid,playerid,pull);
            last.left=left;
            last.top=top;
            last.pageid=pageid;
        };
    }()),

    checkInstall = function() {    
        log('-=> TurnMarker v'+version+' <=-  ['+(new Date(lastUpdate*1000))+']');

        if( ! state.hasOwnProperty('TurnMarker') || state.TurnMarker.version !== schemaVersion) {
            log('  > Updating Schema to v'+schemaVersion+' <');
            switch(state.TurnMarker && state.TurnMarker.version) {
                case 1.16:
                    state.TurnMarker.autoPull = 'none';
                    /* falls through */

                case 'UpdateSchemaVersion':
                    state.TurnMarker.version = schemaVersion;
                    break;

                default:
                    state.TurnMarker = {
                        version: schemaVersion,
                        announceRounds: true,
                        announceTurnChange: true,
                        announcePlayerInTurnAnnounce: true,
                        announcePlayerInTurnAnnounceSize: '70%',
                        autoPull: 'none',
                        autoskipHidden: true,
                        tokenName: 'Round',
                        tokenURL: 'https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580',
                        playAnimations: false,
                        rotation: false,
                        animationSpeed: 5,
                        scale: 1.7,
                        aura1: {
                            pulse: false,
                            size: 5,
                            color: '#ff00ff'
                        },
                        aura2: {
                            pulse: false,
                            size: 5,
                            color: '#00ff00'
                        }
                    };
                    break;
            }
        }
        if(Campaign().get('turnorder') ==='') {
            Campaign().set('turnorder','[]');
        }
        if('undefined' !== typeof GroupInitiative && GroupInitiative.ObserveTurnOrderChange){
            GroupInitiative.ObserveTurnOrderChange(handleExternalTurnOrderChange);
        }
    },

    showHelp = function(who) {
        var marker = getMarker();
        var rounds =parseInt(marker.get('bar2_value'),10);
        sendChat('',
            '/w "'+who+'" '+
'<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'+
    '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'+
        'TurnMarker v'+version+
    '</div>'+
    '<b>Commands</b>'+
    '<div style="padding-left:10px;"><b><span style="font-family: serif;">!tm</span></b>'+
        '<div style="padding-left: 10px;padding-right:20px">'+
            'The following arguments may be supplied in order to change the configuration.  All changes are persisted between script restarts.'+
            '<ul>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 0px 4px;">'+rounds+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">reset [#]</span></b> -- Sets the round counter back to 0 or the supplied #.</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 0px 4px;">'+autoPullOptions[state.TurnMarker.autoPull]+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">autopull <mode></span></b> -- Sets auto pulling to the token whose turn it is.  Modes: '+_.keys(autoPullOptions)+'</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.announceRounds ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-announce</span></b> -- When on, each round will be announced to chat.</li>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.announceTurnChange ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-announce-turn</span></b> -- When on, the transition between visible turns will be announced.</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.announcePlayerInTurnAnnounce ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-announce-player</span></b> -- When on, the player(s) controlling the current turn are included in the turn announcement.</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.autoskipHidden ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-skip-hidden</span></b> -- When on, turn order will automatically be advanced past any hidden turns.</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.playAnimations ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-animations</span></b> -- Turns on turn marker animations. [Experimental!]</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.rotation ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-rotate</span></b> -- When on, the turn marker will rotate slowly clockwise. [Animation]</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.aura1.pulse ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-aura-1</span></b> -- When on, aura 2 will pulse in and out. [Animation]</li> '+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;">'+( state.TurnMarker.aura2.pulse ? '<span style="color: red; font-weight:bold; padding: 0px 4px;">ON</span>' : '<span style="color: #999999; font-weight:bold; padding: 0px 4px;">OFF</span>' )+'</div>'+
                '<li style="border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">toggle-aura-2</span></b> -- When on, aura 2 will pulse in and out. [Animation]</li> '+
            '</ul>'+
        '</div>'+
    '</div>'+
    '<div style="padding-left:10px;"><b><span style="font-family: serif;">!eot</span></b>'+
        '<div style="padding-left: 10px;padding-right:20px;">'+
            'Players may execute this command to advance the initiative to the next turn.  This only succeeds if the current token is one that the caller controls or if it is executed by a GM.'+
        '</div>'+
    '</div>'+
'</div>'
            );
    },

    showHelpInitiative = function(who) {

        sendChat('',
            '/w "'+who+'" '+
    '<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'+
    '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'+
        'Initiative v1.0'+
    '</div>'+
    '<b>Commands</b>'+
    '<div style="padding-left:10px;"><b><span style="font-family: serif;">!i</span></b>'+
        '<div style="padding-left: 10px;padding-right:20px">'+
            'The following arguments are used to decide initiative.'+
            '<ul>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.move.diesize+'</span></div>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.move.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.move.name +'</span></b></li> '+
                
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.rangedattack.diesize+'</span></div>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.rangedattack.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.rangedattack.name +'</span></b> -- any attack using a ranged weapon </li> '+

                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.meleeattack.diesize+'</span></div>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.meleeattack.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.meleeattack.name +'</span></b> -- any attack with a melee weapon, includes thrown</li> '+

                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.castspell.diesize+'</span></div>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.castspell.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.castspell.name +'</span></b></li> '+

                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.swapgear.diesize+'</span></div>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.swapgear.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.swapgear.name +'</span></b> -- changing equipment requiring more than a free action</li> '+

                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.otheraction.diesize+'</span></div>'+
                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.otheraction.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.otheraction.name +'</span></b> -- anything not covered above (bardic inspiration)</li> '+

                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.advantage.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.advantage.name +'</span></b> -- rerolls largest die and takes lowest result</li> '+

                    '<div style="float:right;width:40px;border:1px solid black;background-color:#ffc;text-align:center;"><span style="color: blue; font-weight:bold; padding: 4px 4px;">'+icommand.disadvantage.key+'</span></div>'+
                '<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;"><b><span style="font-family: serif;">'+ icommand.advantage.name +'</span></b> -- rerolls largest die and takes highest result</li> '+

            '</ul>'+
        '</div>'+
    '</div>'+
    '</div>'
            );
    },
    
    handleInput = function(msg){
        var who, tokenized, command;

        if (msg.type !== "api") {
            return;
        }

        who=(getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname');
        tokenized = msg.content.split(/\s+/);
        command = tokenized[0];

        switch(command) {
            case "!tm":
            case "!turnmarker": {
                    if(!playerIsGM(msg.playerid)){
                        return;
                    }
                    let tokens=_.rest(tokenized),marker,value;
                    switch (tokens[0]) {
                        case 'reset':
                            marker = getMarker();
                            value = parseInt(tokens[1],10)||0;
                            marker.set({
                                name: state.TurnMarker.tokenName+' '+value,
                                bar2_value: value
                            });
                            sendChat('','/w "'+who+'" <b>Round</b> count is reset to <b>'+value+'</b>.');
                            break;

                        case 'ping-target':
                            var obj=getObj('graphic',tokens[1]);
                            if(obj){
                                fixedSendPing(obj.get('left'),obj.get('top'),obj.get('pageid'),null,true);
                            }
                            break;

                        case 'autopull':
                            if(_.contains(_.keys(autoPullOptions), tokens[1])){
                                state.TurnMarker.autoPull=tokens[1];
                                sendChat('','/w "'+who+'" <b>AutoPull</b> is now <b>'+(autoPullOptions[state.TurnMarker.autoPull])+'</b>.');
                            } else {
                                sendChat('','/w "'+who+'" "'+tokens[1]+'" is not a valid <b>AutoPull</b> options.  Please specify one of: '+_.keys(autoPullOptions).join(', ')+'</b>.');
                            }
                            break;

                        case 'toggle-announce':
                            state.TurnMarker.announceRounds=!state.TurnMarker.announceRounds;
                            sendChat('','/w "'+who+'" <b>Announce Rounds</b> is now <b>'+(state.TurnMarker.announceRounds ? 'ON':'OFF' )+'</b>.');
                            break;

                        case 'toggle-announce-turn':
                            state.TurnMarker.announceTurnChange=!state.TurnMarker.announceTurnChange;
                            sendChat('','/w "'+who+'" <b>Announce Turn Changes</b> is now <b>'+(state.TurnMarker.announceTurnChange ? 'ON':'OFF' )+'</b>.');
                            break;

                        case 'toggle-announce-player':
                            state.TurnMarker.announcePlayerInTurnAnnounce=!state.TurnMarker.announcePlayerInTurnAnnounce;
                            sendChat('','/w "'+who+'" <b>Player Name in Announce</b> is now <b>'+(state.TurnMarker.announcePlayerInTurnAnnounce ? 'ON':'OFF' )+'</b>.');
                            break;

                        case 'toggle-skip-hidden':
                            state.TurnMarker.autoskipHidden=!state.TurnMarker.autoskipHidden;
                            sendChat('','/w "'+who+'" <b>Auto-skip Hidden</b> is now <b>'+(state.TurnMarker.autoskipHidden ? 'ON':'OFF' )+'</b>.');
                            break;

                        case 'toggle-animations':
                            state.TurnMarker.playAnimations=!state.TurnMarker.playAnimations;
                            if(state.TurnMarker.playAnimations) {
                                stepAnimation(threadSync);
                            } else {
                                marker = getMarker();
                                marker.set({
                                    aura1_radius: '',
                                    aura2_radius: ''
                                });
                            }

                            sendChat('','/w "'+who+'" <b>Animations</b> are now <b>'+(state.TurnMarker.playAnimations ? 'ON':'OFF' )+'</b>.');
                            break;

                        case 'toggle-rotate':
                            state.TurnMarker.rotation=!state.TurnMarker.rotation;
                            sendChat('','/w "'+who+'" <b>Rotation</b> is now <b>'+(state.TurnMarker.rotation ? 'ON':'OFF' )+'</b>.');
                            break;

                        case 'toggle-aura-1':
                            state.TurnMarker.aura1.pulse=!state.TurnMarker.aura1.pulse;
                            sendChat('','/w "'+who+'" <b>Aura 1</b> is now <b>'+(state.TurnMarker.aura1.pulse ? 'ON':'OFF' )+'</b>.');
                            break;

                        case 'toggle-aura-2':
                            state.TurnMarker.aura2.pulse=!state.TurnMarker.aura2.pulse;
                            sendChat('','/w "'+who+'" <b>Aura 2</b> is now <b>'+(state.TurnMarker.aura2.pulse ? 'ON':'OFF' )+'</b>.');
                            break;

                        default:
                        case 'help':
                            showHelp(who);
                            break;

                    }
                }
                break;

            case "!eot": {
                requestTurnAdvancement(msg.playerid);   
                }
                break;

            case "!sr": {
                    if(playerIsGM(msg.playerid)) {
                        startRound();
                    }
                }
                break;

            case "!clear": {
                    // removes all combatants from initiative tracker
                    if(playerIsGM(msg.playerid)) {
                        initiative_hold = [];
                        Campaign().set("turnorder", "");
                        log("------------- ROUND CLEARED! -------------")
                    }
                }
                break;

            case "!i": {
                    let tokens=_.rest(tokenized);
                    switch (tokens[0]) {
                        case 'help':
                            showHelpInitiative(who);
                            break;
                        case 'clear':
                            initiative_hold = [];
                            break;
                        case 'monster':
                            log("Monster Initiative");
                            if(playerIsGM(msg.playerid)) {
                                addCreatureToInitiative(msg);
                            }
                            break;
                        default:
                            addCharacterToInitiative(msg);
                            break;
                    }
                    break;
                }
                break;
        }
    },

    getMarker = function(){  
        var marker = findObjs({
            imgsrc: state.TurnMarker.tokenURL,
            pageid: Campaign().get("playerpageid")    
        })[0];

        if (marker === undefined) {
            marker = createObj('graphic', {
                name: state.TurnMarker.tokenName+' 0',
                pageid: Campaign().get("playerpageid"),
                layer: 'gmlayer',
                imgsrc: state.TurnMarker.tokenURL,
                left: 0,
                top: 0,
                height: 70,
                width: 70,
                bar2_value: 0,
                showplayers_name: true,
                showplayers_aura1: true,
                showplayers_aura2: true
            });
        }
        if(!TurnOrder.HasTurn(marker.id)) {
            TurnOrder.AddTurn({
                id: marker.id,
                pr: 20,
                custom: "",
                pageid: marker.get('pageid')
            });
        }
        return marker;    
    },

    stepAnimation = function( sync ){
        if (!state.TurnMarker.playAnimations || sync !== threadSync) {
            return;
        }
        var marker=getMarker();
        if(active === true) {
            var rotation=(marker.get('bar1_value')+state.TurnMarker.animationSpeed)%360;
            marker.set('bar1_value', rotation );
            if(state.TurnMarker.rotation) {
                marker.set( 'rotation', rotation );
            }
            if( state.TurnMarker.aura1.pulse ) {
                marker.set('aura1_radius', Math.abs(Math.sin(rotation * (Math.PI/180))) * state.TurnMarker.aura1.size );
            } else {
                marker.set('aura1_radius','');
            }
            if( state.TurnMarker.aura2.pulse  ) {
                marker.set('aura2_radius', Math.abs(Math.cos(rotation * (Math.PI/180))) * state.TurnMarker.aura2.size );
            } else {
                marker.set('aura2_radius','');
            }
            setTimeout(_.bind(stepAnimation,this,sync), 100);
        }
    },
    checkForTokenMove = function(obj){
        var turnOrder, current, marker;
        if(active) {
            turnOrder = TurnOrder.Get();
            current = _.first(turnOrder);
            if( obj && current && current.id === obj.id) {
               threadSync++;
                
                marker = getMarker();
                marker.set({
                    "layer": obj.get("layer"),
                    "top": obj.get("top"),
                    "left": obj.get("left")
                });
                
               setTimeout(_.bind(stepAnimation,this,threadSync), 300);
            }
        }
    },
    requestTurnAdvancement = function(playerid){
        if(active) {
            let turnOrder = TurnOrder.Get(),
                current = getObj('graphic',_.first(turnOrder).id),
                character = getObj('character',(current && current.get('represents')));
            if(playerIsGM(playerid) ||
                ( current &&
                       ( _.contains(current.get('controlledby').split(','),playerid) ||
                       _.contains(current.get('controlledby').split(','),'all') )
                    ) ||
                ( character &&
                       ( _.contains(character.get('controlledby').split(','),playerid) ||
                       _.contains(character.get('controlledby').split(','),'all') )
                    )
                )
            {
                TurnOrder.Next();
                turnOrderChange(true);
            }
        }
    },
    announceRound = function(round){
        if(state.TurnMarker.announceRounds) {
            sendChat(
                '', 
                "/direct "+
                "<div style='"+
                    'background-color: #515151;'+
                    'border: 3px solid #808080;'+
                    'font-size: 20px;'+
                    'text-align:center;'+
                    'vertical-align: top;'+
                    'color: white;'+
                    'font-weight:bold;'+
                    'padding: 5px 5px;'+
                "'>"+
                    "Round: "+ round +
                "</div>"+
                '<a style="position:relative;z-index:10000; top:-1em; float: right;font-size: .6em; color: white; border: 1px solid #cccccc; border-radius: 1em; margin: 0 .1em; font-weight: bold; padding: .1em .4em;" href="!tm reset ?{Round number|0}">Reset &'+'#x21ba;</a>'
            );
        }
    },

    turnOrderChange = function(FirstTurnChanged){
        var marker = getMarker();
                    
        if( !Campaign().get('initiativepage') ) {
            return;
        }
        
        var turnOrder = TurnOrder.Get();
        
        if (!turnOrder.length || turnOrder.length < 2) {
            return;
        }

        var current = _.first(turnOrder);

        if(state.TurnMarker.playAnimations) {
            threadSync++;
            setTimeout(_.bind(stepAnimation,this,threadSync), 300);
        }
		
		// TODO: change?
        if (current.id === "20") {
            return;
        }
      
        handleMarkerTurn();

        if(state.TurnMarker.autoskipHidden) {
            TurnOrder.NextVisible();
            handleMarkerTurn();
        }

        turnOrder=TurnOrder.Get();

        if(turnOrder[0].id === marker.id) {
            return;
        }

        current = _.first(TurnOrder.Get());
        
        var currentToken = getObj("graphic", turnOrder[0].id),
            currentChar = getObj('character', (currentToken||{get:_.noop}).get('represents'));
        if(currentToken) {

            if(FirstTurnChanged) {
                handleAnnounceTurnChange();
            }
            
            var size = Math.max(currentToken.get("height"),currentToken.get("width")) * state.TurnMarker.scale;
              
            if (marker.get("layer") === "gmlayer" && currentToken.get("layer") !== "gmlayer") {
                marker.set({
                    "top": currentToken.get("top"),
                    "left": currentToken.get("left"),
                    "height": size,
                    "width": size
                });
                setTimeout(function() {
                    marker.set({
                        "layer": currentToken.get("layer")
                    });    
                }, 500);
            } else {
                marker.set({
                    "layer": currentToken.get("layer"),
                    "top": currentToken.get("top"),
                    "left": currentToken.get("left"),
                    "height": size,
                    "width": size
                });   
            }
            toFront(currentToken);

            if( 'all' === state.TurnMarker.autoPull ||
                ('npcs' === state.TurnMarker.autoPull && (
                    '' === currentToken.get('controlledby') &&
                    ( !currentChar || '' === currentChar.get('controlledby'))
                ))
            ){
                fixedSendPing(currentToken.get('left'),currentToken.get('top'),currentToken.get('pageid'),null,true);
            }
        }
    },

    handleDestroyGraphic = function(obj){
        if(TurnOrder.HasTurn(obj.id)){
            let prev=JSON.parse(JSON.stringify(Campaign()));
            TurnOrder.RemoveTurn(obj.id);
            handleTurnOrderChange(Campaign(),prev);
        }
    },

    handleTurnOrderChange = function(obj, prev) {
        var prevOrder=JSON.parse(prev.turnorder);
        var objOrder=JSON.parse(obj.get('turnorder'));

        if( _.isArray(prevOrder) &&
            _.isArray(objOrder) &&
            prevOrder.length &&
            objOrder.length &&
            objOrder[0].id !== prevOrder[0].id
          ) {
            turnOrderChange(true);
        }
    },

    handleExternalTurnOrderChange = function() {
        var marker = getMarker(),
            turnorder = Campaign().get('turnorder'),
            markerTurn;

        turnorder = ('' === turnorder) ? [] : JSON.parse(turnorder);
        markerTurn = _.filter(turnorder, function(i){
            return marker.id === i.id;
        })[0];

        if(markerTurn.pr !== 20){
            markerTurn.pr = 20;
            turnorder =_.union([markerTurn], _.reject(turnorder, function(i){
                return marker.id === i.id || (getObj('graphic',i.id)||{get:_.noop}).get('imgsrc')===state.TurnMarker.tokenURL;
            }));
            Campaign().set('turnorder',JSON.stringify(turnorder));
        }
        _.defer(dispatchInitiativePage);
    },

    handleMarkerTurn = function(){
        var marker = getMarker(),
            turnOrder = TurnOrder.Get(),
            round;

        if(turnOrder[0].id === marker.id) {
            round=parseInt(marker.get('bar2_value'))+1;
            marker.set({
                name: state.TurnMarker.tokenName+' '+round,
                bar2_value: round
            });
            announceRound(round);
            TurnOrder.Next();
        }
    },
    handleAnnounceTurnChange = function(){

        if(state.TurnMarker.announceTurnChange ) {
            var marker = getMarker();
            var turnOrder = TurnOrder.Get();
            var currentToken = getObj("graphic", turnOrder[0].id);
            if('gmlayer' === currentToken.get('layer')) {
                return;
            }
            var previousTurn=_.last(_.filter(turnOrder,function(element){
                var token=getObj("graphic", element.id);
                return token &&
                    token.get('layer') !== 'gmlayer' &&
                    element.id !== marker.id;
            }));

            /* find previous token. */
            var previousToken = getObj("graphic", previousTurn.id);
            var pImage=previousToken.get('imgsrc');
            var cImage=currentToken.get('imgsrc');
            var pRatio=previousToken.get('width')/previousToken.get('height');
            var cRatio=currentToken.get('width')/currentToken.get('height');
            
            var pNameString="The Previous turn is done.";
            if(previousToken && previousToken.get('showplayers_name')) {
                pNameString='<span style=\''+
                        'font-family: Baskerville, "Baskerville Old Face", "Goudy Old Style", Garamond, "Times New Roman", serif;'+
                        'text-decoration: underline;'+
                        'font-size: 130%;'                        +
                    '\'>'+
                        previousToken.get('name')+
                    '</span>\'s turn is done.'; //TODO add actions           
            }
            
            var cNameString='The next turn has begun!';
            if(currentToken && currentToken.get('showplayers_name')) {
				
				var cNameActions = "";
				for (var i = 0; i < initiative_hold.length; i++) {
					if (initiative_hold[i][1] === turnOrder[0].id) {
                        cNameActions = cNameActions + printCombatantActionsHtml(initiative_hold[i][2]);
						break;
					} 
				}

                cNameString='<span style=\''+
                    'font-family: Baskerville, "Baskerville Old Face", "Goudy Old Style", Garamond, "Times New Roman", serif;'+
                    'text-decoration: underline;'+
                    'font-size: 130%;'+
                '\'>'+
                    currentToken.get('name')+
				'</span>, it\'s now your turn! <br><br>' + cNameActions;
				// initiative_hold.push([msg.who, selected._id, initdice, obj]);
            }
 
            
            var PlayerAnnounceExtra='<a style="position:relative;z-index:10000; top:-1em;float: right;font-size: .6em; color: white; border: 1px solid #cccccc; border-radius: 1em; margin: 0 .1em; font-weight: bold; padding: .1em .4em;" href="!eot">EOT &'+'#x21e8;</a>';
            if(state.TurnMarker.announcePlayerInTurnAnnounce) {
                var Char=currentToken.get('represents');
                if(Char) {
                    Char=getObj('character',Char);
                    if(Char && _.isFunction(Char.get)) {
                        var Controllers=Char.get('controlledby').split(',');
                        _.each(Controllers,function(c){
                            switch(c) {
                                case 'all':
                                    PlayerAnnounceExtra+='<div style="'+
                                            'padding: 0px 5px;'+
                                            'font-weight: bold;'+
                                            'text-align: center;'+
                                            'font-size: '+state.TurnMarker.announcePlayerInTurnAnnounceSize+';'+
                                            'border: 5px solid black;'+
                                            'background-color: white;'+
                                            'color: black;'+
                                            'letter-spacing: 3px;'+
                                            'line-height: 130%;'+
                                        '">'+
                                            'All'+
                                        '</div>';
                                    break;

                                default:
                                    var player=getObj('player',c);
                                    if(player) {
                                        var PlayerColor=player.get('color');
                                        var PlayerName=player.get('displayname');
                                        PlayerAnnounceExtra+='<div style="'+
                                                'padding: 5px;'+
                                                'text-align: center;'+
                                                'font-size: '+state.TurnMarker.announcePlayerInTurnAnnounceSize+';'+
                                                'background-color: '+PlayerColor+';'+
                                                'text-shadow: '+
                                                    '-1px -1px 1px #000,'+
                                                    ' 1px -1px 1px #000,'+
                                                    '-1px  1px 1px #000,'+
                                                    ' 1px  1px 1px #000;'+
                                                'letter-spacing: 3px;'+
                                                'line-height: 130%;'+
                                            '">'+
                                                PlayerName+
                                            '</div>';
                                    }
                                    break;
                            }
                        });
                    }
                }
            }
            
            var tokenSize=70;
            sendChat(
                '', 
                "/direct "+
                "<div style='border: 3px solid #808080; background-color: #515151; color: white; padding: 1px 1px;'>"+
                    '<div style="text-align: left;  margin: 5px 5px;">'+
                        '<a style="position:relative;z-index:1000;float:left; background-color:transparent;border:0;padding:0;margin:0;display:block;" href="!tm ping-target '+currentToken.id+'">'+
                            "<img src='"+cImage+"' style='width:"+Math.round(tokenSize*pRatio)+"px; height:"+tokenSize+"px; padding: 0px 2px;' />"+
                        '</a>'+
                         cNameString+
                    '</div>'+
                    // '<div style="text-align: right; margin: 5px 5px; position: relative; vertical-align: text-bottom;">'+
                    //     // '<a style="position:relative;z-index:1000;float:right; background-color:transparent;border:0;padding:0;margin:0;display:block;" href="!tm ping-target '+currentToken.id+'">'+
                    //     //     "<img src='"+cImage+"' style='width:"+Math.round(tokenSize*cRatio)+"px; height:"+tokenSize+"px; padding: 0px 2px;' />"+
                    //     // '</a>'+
                    //      '<span style="position:absolute; bottom: 0;right:'+Math.round((tokenSize*cRatio)+6)+'px;">'+
                    //         pNameString+
                    //      '</span>'+
                    //     '<div style="clear:both;"></div>'+
                    // '</div>'+
                     PlayerAnnounceExtra+
                    '<div style="clear:both;"></div>'+
                "</div>"
            );
        }
    },
    resetMarker = function() {
        active=false;
        threadSync++;

        var marker = getMarker();
        
        marker.set({
            layer: "gmlayer",
            aura1_radius: '',
            aura2_radius: '',
            left: 35,
            top: 35,
            height: 70,
            width: 70,
            rotation: 0,
            bar1_value: 0
        });
    },
    startMarker = function() {
        var marker = getMarker();

        if(state.TurnMarker.playAnimations && state.TurnMarker.aura1.pulse) {
            marker.set({
                aura1_radius: state.TurnMarker.aura1.size,
                aura1_color: state.TurnMarker.aura1.color
            });   
        }
        if(state.TurnMarker.playAnimations && state.TurnMarker.aura2.pulse) {
            marker.set({
                aura2_radius: state.TurnMarker.aura2.size,
                aura2_color: state.TurnMarker.aura2.color
            });   
        }
        active=true;
        stepAnimation(threadSync);
        turnOrderChange(true);
    },
    dispatchInitiativePage = function(){
        if( !Campaign().get('initiativepage') ) {
            resetMarker();
        } else {
            startMarker();
        }
    },
    registerEventHandlers = function(){        
        on("change:campaign:initiativepage", dispatchInitiativePage );
        on("change:campaign:turnorder", handleTurnOrderChange );
        on("change:graphic:lastmove", checkForTokenMove );
        on("destroy:graphic", handleDestroyGraphic );
        on("chat:message", handleInput );

        dispatchInitiativePage();
    }
    ;

    return {
        CheckInstall: checkInstall,
        RegisterEventHandlers: registerEventHandlers,
		TurnOrderChange: handleExternalTurnOrderChange
    };

}());

var TurnOrder = TurnOrder || (function() {
    "use strict";

    return {
        Get: function(){
            var to=Campaign().get("turnorder");
            to=(''===to ? '[]' : to); 
            return JSON.parse(to);
        },
        Set: function(turnOrder){
            Campaign().set({turnorder: JSON.stringify(turnOrder)});
        },
        Next: function(){
            this.Set(TurnOrder.Get().rotate(1));
            if("undefined" !== typeof Mark && _.has(Mark,'Reset') && _.isFunction(Mark.Reset)) {
                Mark.Reset();
            }
        },
        NextVisible: function(){
            var turns=this.Get();
            var context={skip: 0};
            var found=_.find(turns,function(element){
                var token=getObj("graphic", element.id);
                if(
                    (undefined !== token) &&
                    (token.get('layer')!=='gmlayer')
                )
                {
                    return true;
                }
                else
                {
                    this.skip++;
                }
            },context);
            if(undefined !== found && context.skip>0)
            {
                this.Set(turns.rotate(context.skip));
            }
        },
        HasTurn: function(id){
         return (_.filter(this.Get(),function(turn){
                return id === turn.id;
            }).length !== 0);
        },
        AddTurn: function(entry){
            var turnorder = this.Get();
            turnorder.push(entry);
            this.Set(turnorder);
        },
        RemoveTurn: function(id){
            this.Set(_.reject(this.Get(),(o)=>o.id===id));
        }

    };
}());

Object.defineProperty(Array.prototype, 'rotate', {
    enumerable: false,
    writable: true
});

Array.prototype.rotate = (function() {
    "use strict";
    var unshift = Array.prototype.unshift,
        splice = Array.prototype.splice;

    return function(count) {
        var len = this.length >>> 0;
            count = count >> 0;

        unshift.apply(this, splice.call(this, count % len, len));
        return this;
    };
}());

