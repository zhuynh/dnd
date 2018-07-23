/**
 * COMMANDS:
 * !travel reset
 * !travel help
 * !travel begin [name] [CL] [traverse] [forage] [explore] [lost] [PartySize]
 * !travel participantentry [Task] [Skill] [Ability] [Cir]
 * !travel taskallocation [traverse] [forage] [explore]
 * !travel update 
 * 
 * NEW/IN-PROGRESS:
 * !TRAVEL update [type] [value]
 */

var Travel = Travel || (function(){

    var skillsTableKVP = {
        acrobatics: "dexterity",
        animal_handling: "wisdom",
        arcana: "intelligence",
        athletics: "strength",
        deception: "charisma",
        history: "intelligence",
        insight: "wisdom",
        intimidation: "charisma",
        investigation: "intelligence",
        medicine: "wisdom",
        nature: "intelligence",
        preception: "wisdom",
        performance: "charisma",
        persuasion: "charisma",
        religion: "intelligence",
        sleight_of_hand: "dexterity",
        stealth: "dexterity",
        survival: "wisdom"
    };

    var toggleParticipantEntriesOpen = false;
    var toggleTaskAllocationOpen = false;

    var arrayTravelEntries = [];
    var toggleTraverseAvailable = false;
    var toggleForageAvailable = false;
    var toggleExploreAvailable = false;
    var travelDice = 0;
    var partysize = null;
    var travelRegion = null;

    handleInput = function(msg){
        var who, tokenized, command;

        // log("recieved message: "+msg.content);
        if (msg.type !== "api") {
            return;
        }

        who=(getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname');
        tokenized = msg.content.split(/\s+/);
        command = tokenized[0];

        switch(command) {
            case "!travel": {
                    let tokens=_.rest(tokenized);

                    log("Travel API called: " + command + " | " + tokens[0]);
                    // GM Functions
                    if(playerIsGM(msg.playerid)){
                        switch (tokens[0]) {

                            // remove all help data
                            case 'reset':
                                // getMarker() function?
                                travelReset();
                                sendChat('',"<b>Traveling: </b> data cleared.");
                                break;
                            
                            // open travel to player submissions
                            case 'begin':
                                travelBegin(msg);
                                sendChat('',"<b>Traveling: </b> open for character submissions. ");
                                break;
                            case 'update':
                                if (travelRegion == null) return;

                                if (["name","challengelevel","traverse","forage","explore","lost"].indexOf(tokens[1].toLowerCase()) > -1) {
                                    travelRegion[tokens[1].toLowerCase()] = tokens[2];
                                } else if (tokens[1] == "partysize") {
                                    partysize = parseInt(tokens[2]);
                                } else {
                                    log("Failed to update region stat '"+tokens[1]+"' with value '"+tokens[2]+"'")
                                }
                                sendChat('',"/w "+msg.who+" <b>Traveling: </b> updated region stats. ");
                                break;
                            // player submits or updates a travel entry
                            //!travel entry --{T/F/E} --{Skill} --{Ability} --{Adv/Dis} 
                            case 'participantentry':
                                if (toggleParticipantEntriesOpen && msg.selected != null) {
                                    travelCharacterEntry(msg);
                                    sendChat('',"<b>Traveling: </b> "+who+", your response as been recorded");
                                    sendChat('',"<b>Traveling: </b> "+arrayTravelEntries.length+"/"+partysize+" entries submitted");
                                } else {
                                    sendChat('',"<b>Traveling: </b> "+who+", travel is not currently active or a character was not selected");
                                }
                                // at the end of each entry, check to see if all participants have been entered. if so, calculate travel dice and close off future entries
                                if ( arrayTravelEntries.length > 0 && arrayTravelEntries.length >= partysize){
                                    log("Starting: travelGroupCheckComplete");
                                    travelGroupCheckComplete();
                                }
                                break;
                            case 'taskallocation':
                                if (toggleTaskAllocationOpen) {
                                    log("Starting: travelTaskAllocationComplete");
                                    travelTaskAllocationComplete(msg);
                                } else {
                                    sendChat('',"<b>Traveling: </b> "+who+", task allocation is not currently active");
                                }
                                break;
                            default:
                            case 'help':
                                showHelp(who);
                                break;
    
                        }
                    }
                    // PC Functions 
                    else {
                        switch (tokens[0]) {

                            // player submits or updates a travel entry
                            //!travel entry --{T/F/E} --{Skill} --{Ability} --{Adv/Dis} 
                            case 'participantentry':
                                if (toggleParticipantEntriesOpen && msg.selected != null) {
                                    travelCharacterEntry(msg);
                                    sendChat('',"<b>Traveling: </b> "+who+", your response as been recorded");
                                    sendChat('',"<b>Traveling: </b> "+arrayTravelEntries.length+"/"+partysize+" entries submitted");
                                } else {
                                    sendChat('',"<b>Traveling: </b> "+who+", travel is not currently active or a character was not selected");
                                }
                                // at the end of each entry, check to see if all participants have been entered. if so, calculate travel dice and close off future entries
                                if ( arrayTravelEntries.length > 0 && arrayTravelEntries.length >= partysize){
                                    log("Starting: travelGroupCheckComplete");
                                    travelGroupCheckComplete();
                                }
                                break;
                            case 'taskallocation':
                                if (toggleTaskAllocationOpen) {
                                    log("Starting: travelTaskAllocationComplete");
                                    travelTaskAllocationComplete(msg);
                                } else {
                                    sendChat('',"<b>Traveling: </b> "+who+", task allocation is not currently active");
                                }
                                break;
                            default:
                            case 'help':
                                showHelp(who);
                                break;
    
                        }
                    }
                }
                break;
        }
	},
	
	showHelp = function(who) {

        sendChat('',
            '/w "'+who+'" '+
    '<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'+
    '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'+
        'Travel Rules v1.0'+
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
    
    // WIP
    travelReset = function() {
        arrayTravelEntries = [];
        travelRegion = null;
        toggleTraverseAvailable = false;
        toggleForageAvailable = false;
        toggleExploreAvailable = false;
        toggleParticipantEntriesOpen = false
        toggleTaskAllocationOpen - false
        partysize = null;
    },

    // done
    travelBegin = function(msg) {
        toggleParticipantEntriesOpen = true;
        var args = msg.content.split(/\s+/);
        // Region [name, Challenge, traverse, forage, explore, lost]
        travelRegion = {
            name: args[2],
            challengelevel: args[3],
            traverse: args[4],
            forage: args[5],
            explore: args[6],
            lost: args[7],
        };
        partysize = args[8];

        log("Region Setup: "+travelRegion);
        sendChat("", "<b>Traveling: </b> Region - '"+travelRegion["name"]+"' has been setup");
    },
    
    // TODO
    // Can only be called if Travel is Active
	travelCharacterEntry = function(msg) {
        //!travel participantentry --{T/F/E} --{Skill} --{Ability} --{Adv/Dis} 
        var args = msg.content.split(/\s+/);
        var travelTask = args[2].toLowerCase();
        var skillChoice = args[3].toLowerCase();
        var abilityChoice = args[4].toLowerCase();
        var circumstantialEffects = args[5].toLowerCase();

        sendChat("", "<b>Traveling: </b> "+ msg.who + " = " + travelTask + "|" + skillChoice + "|" + abilityChoice + "|" + circumstantialEffects);

        _.each(msg.selected, function (selected) {
            
            if(selected._type != "graphic") return;
            var obj = getObj("graphic", selected._id);
            var currChar = getObj("character", obj.get("represents")) || "";
            var currCharName = obj.get('name');

            if (currChar.length != 0 && selected != null && ( travelTask == 'traverse' || travelTask == 'forage' || travelTask == 'explore' ) ) {

                var skill = findObjs({name: skillChoice+"_bonus",_type: "attribute", _characterid: currChar.id}, {caseInsensitive: true})[0];
                var abilityModCurr = findObjs({name: skillsTableKVP[skillChoice]+"_mod",_type: "attribute", _characterid: currChar.id}, {caseInsensitive: true})[0];
                var abilityModNew = findObjs({name: abilityChoice+"_mod",_type: "attribute", _characterid: currChar.id}, {caseInsensitive: true})[0];
                var totalskillbonus = skill.get("current") - abilityModCurr.get("current") + abilityModNew.get("current");
                var rollSkillCheckResult;

                // add advantage/disadvantage choice
                switch(circumstantialEffects) {
                    case 'adv': {
                        rollSkillCheckResult = Math.max(rollDie(1,20,totalskillbonus), rollDie(1,20,totalskillbonus));
                    } break;
                    case 'disadv': {
                        rollSkillCheckResult = Math.min(rollDie(1,20,totalskillbonus), rollDie(1,20,totalskillbonus));
                    } break;
                    default: {
                        rollSkillCheckResult = rollDie(1,20,totalskillbonus);
                    } break;
                }

                log(currCharName+" rolled: "+rollSkillCheckResult+", "+skillChoice+"|"+abilityChoice+", +"+totalskillbonus);
                arrayTravelEntries.push([rollSkillCheckResult, selected._id]);

                switch(travelTask) {
                    case 'traverse': {
                            log("travelCharacterEntry. traverse");
                            toggleTraverseAvailable = true;
                        }
                        break;
                    
                    case 'forage': {
                            log("travelCharacterEntry. forage");
                            toggleForageAvailable = true;
                        }
                        break;
                    
                    case 'explore': {
                            log("travelCharacterEntry. explore");
                            toggleExploreAvailable = true;
                        }
                        break;
                }
                log("Processed Travel Task");
            }
        });

        //TODO: rework
        switch(circumstantialEffects) {
            case 'a':
                break;
            
            case 'd':
                break;
        }
    },

    // TODO
    travelGroupCheckComplete = function(msg) {
        // highest, lowest, median
        var groupCheckResults = getGroupCheckResults(arrayTravelEntries);
        toggleParticipantEntriesOpen = false;

        if (groupCheckResults[2] >= travelRegion["challengelevel"] + 5) {
            travelDice = 5;
        } else if (groupCheckResults[2] >= travelRegion["challengelevel"]) {
            travelDice = 4
        } else if (groupCheckResults[2] >= travelRegion["challengelevel"] - 5) {
            travelDice = 3
        } else {
            // Skip to travelTaskAllocationComplete()
            travelDice = 0;
            var message = {
                content: "!travel taskallocation 0 0 0"
            }
            sendChat("", "<b>Traveling: </b> failed to gain any travel dice");
            toggleTaskAllocationOpen = true;
            arrayTravelEntries = [];
            travelTaskAllocationComplete(message);
            return;
        }

        toggleTaskAllocationOpen = true;
        log("Groupcheck: " + groupCheckResults[2] + "|" + travelRegion["challengelevel"]+"±5, gained "+travelDice+"d6");
        var restrictions = "";
        if(toggleTraverseAvailable) {
            restrictions =restrictions + "traverse "
        }
        if(toggleForageAvailable) {
            restrictions =restrictions + " forage "
        }
        if(toggleExploreAvailable) {
            restrictions =restrictions + " explore"
        }
        restrictions.replace(/\s\s+/g, ' ,');
        sendChat("", "<b>Traveling: </b> Party gained " + travelDice + "d6 travel dice! please allocate them between "+restrictions);

        //Reset travel variables for next day
        arrayTravelEntries = [];
    },

    // TODO
    travelTaskAllocationComplete = function(msg) {
        // traverse, forage, explore
        var args = msg.content.split(/\s+/);
        var traverseDice = args[2].toLowerCase();
        var forageDice = args[3].toLowerCase();
        var exploreDice = args[4].toLowerCase();

        log("Travel Task Allo.: "+traverseDice +"|"+ forageDice +"|"+ exploreDice);

        if (parseInt(traverseDice) + parseInt(forageDice) + parseInt(exploreDice) == travelDice) {

            if ( !(!toggleTraverseAvailable && traverseDice >0) && !(!toggleForageAvailable && forageDice >0) && !(!toggleExploreAvailable && exploreDice >0) ) {
                //random 1-6
                var traverseResult = (rollDie(traverseDice,6) >= travelRegion["traverse"] ? (rollDie(traverseDice,6) >= travelRegion["traverse"] ? "Critical Success!" : "Success" ) : "Fail" );
                var forageResult = (rollDie(forageDice,6) >= travelRegion["forage"] ? (rollDie(forageDice,6) >= travelRegion["forage"] ? "Critical Success!" : "Success" ) : "Fail" );
                var exploreResult = (rollDie(exploreDice,6) >= travelRegion["explore"] ? (rollDie(exploreDice,6) >= travelRegion["explore"] ? "Critical Success!" : "Success" ) : "Fail, roll to become lost" );

                log("travelTaskAllocationComplete. Writing task results");

                sendChat("", "<b>Traveling: </b> Task Results "
                +"<br> traverse: "+traverseResult
                +"<br> forage: "+forageResult
                +"<br> explore: "+exploreResult );

                //Reset travel variables for next day
                arrayTravelEntries = [];
                toggleTraverseAvailable = false;
                toggleForageAvailable = false;
                toggleExploreAvailable = false;
                toggleTaskAllocationOpen = false;
                toggleParticipantEntriesOpen = true;

                sendChat("", "<b>Traveling: </b> Beginning new travel day!");
                sendChat('',"<b>Traveling: </b> open for character submissions. ");

            } else {
                // ERROR, travel dice put into invalid travel task
                sendChat("", "<b>Traveling: </b> ERROR!, travel dice put into invalid travel task");
                log("travelTaskAllocationComplete. ERROR, travel dice put into invalid travel task");
            }
        } else {
            // ERROR, unspent or extra travel dice
            sendChat("", "<b>Traveling: </b> ERROR!, unspent or extra travel dice");
            log("travelTaskAllocationComplete. ERROR, unspent or extra travel dice");
        }
    },

    // TODO
    travelGroupCheckResultMessage = function(msg) {

        sendChat('',
            '/w "'+who+'" '+
    '<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'+
    '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'+
        'Travel Rules v1.0'+
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

    // TODO
    travelTaskResultMessage = function(msg) {

        sendChat('',
            '/w "'+who+'" '+
    '<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'+
    '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'+
        'Travel Rules v1.0'+
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

    registerEventHandlers = function(){
        on("chat:message", handleInput );
    }
    ;

    return {
        RegisterEventHandlers: registerEventHandlers
    };
	
}());

function processInlinerolls(msg) {
    log("Processing inline rolls");
    if (_.has(msg, 'inlinerolls')) {
        return _.chain(msg.inlinerolls)
                .reduce(function(previous, current, index) {
                    previous['$[[' + index + ']]'] = current.results.total || 0;
                    return previous;
                },{})
                .reduce(function(previous, current, index) {
                    return previous.replace(index, current);
                }, msg.content)
                .value();
    } else {
        return msg.content;
    }
}

function getGroupCheckResults(groupCheckArray) {
    var sortedGroupCheckArray = groupCheckArray.sort(sortFunction);
    log("Travel Array: "+ sortedGroupCheckArray);
    return [
        //highest Roll
        sortedGroupCheckArray[sortedGroupCheckArray.length - 1][0],
        //lowest Roll
        sortedGroupCheckArray[0][0],
        //highest DC Passed
        sortedGroupCheckArray[Math.round(sortedGroupCheckArray.length / 2) - 1][0]
    ];
}

// sorts by first index of 2d array, in ascending order
function sortFunction(a, b) {
	if (a[0] === b[0]) {
		return 0;
	}
	else {
		return (a[0] > b[0]) ? 1 : -1;
	}
}

// rolls dice
function rollDie(amount,type,modifier){
    if(amount == 0) {
        log("rolled 0");
        return 0;
    }
    var sum = 0;
    if(modifier == null){
        modifier = 0;
    }

    for(var i = 0; i < amount; i++) {
        sum = sum + (Math.floor(Math.random() * type) + 1);
    }
    sum = sum + modifier;
    log("rolled "+sum);
    return sum;
}