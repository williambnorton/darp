/** @module pulsegroup Create Configuration for joining our pulseGroup object */

import { PulseGroup } from './pulsegroup';

export type PulseGroups = { [x: string]: PulseGroup };
export var myPulseGroups:PulseGroups;

//export function getMyPulseGroups() { return myPulseGroups;}

export function forEachPulseGroup(callback: CallableFunction) {
    for (var pulseGroup in myPulseGroups) 
        callback(myPulseGroups, myPulseGroups[pulseGroup]);
};

export function addPulseGroup(pulseGroup:PulseGroup) {
    myPulseGroups[pulseGroup.groupName]=pulseGroup;
    return myPulseGroups[pulseGroup.groupName];
};
