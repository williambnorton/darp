"use strict";
/** @module pulsegroup Create Configuration for joining our pulseGroup object */
exports.__esModule = true;
var myPulseGroups;
function getMyPulseGroups() { return myPulseGroups; }
exports.getMyPulseGroups = getMyPulseGroups;
function forEachPulseGroup(callback) {
    for (var pulseGroup in myPulseGroups)
        callback(myPulseGroups, myPulseGroups[pulseGroup]);
}
exports.forEachPulseGroup = forEachPulseGroup;
;
function addPulseGroup(pulseGroup) {
    myPulseGroups[pulseGroup.groupName] = pulseGroup;
    return myPulseGroups[pulseGroup.groupName];
}
exports.addPulseGroup = addPulseGroup;
;
