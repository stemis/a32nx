class CDUVerticalRevisionPage {
    static ShowPage(mcdu, waypoint, verticalWaypoint) {
        const waypointInfo = waypoint.infos;
        if (waypointInfo instanceof WayPointInfo) {
            mcdu.clearDisplay();
            mcdu.page.Current = mcdu.page.VerticalRevisionPage;
            let waypointIdent = "---";
            if (waypoint) {
                waypointIdent = waypoint.ident;
            }
            let coordinates = "---";
            if (waypointInfo.coordinates) {
                coordinates = waypointInfo.coordinates.toDegreeString();
            }
            const transAltLevel = waypoint.constraintType === 2 /* DES */ ? mcdu.flightPlanManager.destinationTransitionLevel : mcdu.flightPlanManager.originTransitionAltitude;
            let climbSpeedLimitCell = "*[][color]cyan";
            if (isFinite(mcdu.managedSpeedLimit) && isFinite(mcdu.managedSpeedLimitAlt)) {
                climbSpeedLimitCell = mcdu.managedSpeedLimit + "/" + this.formatFl(mcdu.managedSpeedLimitAlt, transAltLevel) + "[color]magenta";
            }

            let speedConstraint = 0;
            if (waypoint.speedConstraint > 10) {
                speedConstraint = waypoint.speedConstraint.toFixed(0);
            }
            let altitudeConstraint = "";
            switch (waypoint.legAltitudeDescription) {
                case 1: {
                    altitudeConstraint = this.formatFl(Math.round(waypoint.legAltitude1), transAltLevel);
                    break;
                }
                case 2: {
                    altitudeConstraint = "+" + this.formatFl(Math.round(waypoint.legAltitude1), transAltLevel);
                    break;
                }
                case 3: {
                    altitudeConstraint = "-" + this.formatFl(Math.round(waypoint.legAltitude1), transAltLevel);
                    break;
                }
                case 4: {
                    if (waypoint.legAltitude1 < waypoint.legAltitude2) {
                        altitudeConstraint = "+" + this.formatFl(Math.round(waypoint.legAltitude1), transAltLevel)
                            + "/-" + this.formatFl(Math.round(waypoint.legAltitude2), transAltLevel);
                    } else {
                        altitudeConstraint = "+" + this.formatFl(Math.round(waypoint.legAltitude2), transAltLevel)
                            + "/-" + this.formatFl(Math.round(waypoint.legAltitude1), transAltLevel);
                    }
                    break;
                }
            }

            const altError = this.formatAltErrorTitleAndValue(waypoint, verticalWaypoint);

            mcdu.setTemplate([
                ["VERT REV {small}AT{end}{green} " + waypointIdent + "{end}"],
                [""],
                [""],
                ["\xa0CLB SPD LIM", ""],
                [climbSpeedLimitCell, "RTA>[color]inop"],
                ["\xa0SPD CSTR", "ALT CSTR\xa0"],
                [speedConstraint ? speedConstraint + "[color]magenta" : "*[\xa0\xa0\xa0][color]cyan", altitudeConstraint ? altitudeConstraint + "[color]magenta" : "[\xa0\xa0\xa0\xa0]*[color]cyan"],
                ["MACH/START WPT[color]inop", altError[0]],
                [`\xa0{inop}[\xa0]/{small}${waypointIdent}{end}{end}`, altError[1]],
                [""],
                ["<WIND", "STEP ALTS>[color]inop"],
                [""],
                ["<RETURN"]
            ]);
            mcdu.onLeftInput[0] = () => {}; // EFOB
            mcdu.onRightInput[0] = () => {}; // EXTRA
            mcdu.onLeftInput[1] = (value, scratchpadCallback) => {
                if (value === FMCMainDisplay.clrValue) {
                    mcdu.setSpeedLimit(undefined, undefined);
                    this.ShowPage(mcdu, waypoint, verticalWaypoint);

                    return;
                } else if (!value || !value.includes("/")) {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                    scratchpadCallback();

                    return;
                }

                const [speedLimitInput, speedLimitAltInput] = value.split("/");
                const speedLimit = parseInt(speedLimitInput);
                const speedLimitAlt = speedLimitAltInput.startsWith("FL") ? 100 * parseInt(speedLimitAltInput.replace("FL", "")) : 10 * Math.round(parseInt(speedLimitAltInput) / 10);

                if (!isFinite(speedLimit) || !isFinite(speedLimitAlt)) {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                    scratchpadCallback();

                    return;
                }

                if (speedLimit < 90 || speedLimit > 350 || speedLimitAlt > 45000) {
                    mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                    scratchpadCallback();

                    return;
                }

                mcdu.setSpeedLimit(speedLimit, speedLimitAlt);
                this.ShowPage(mcdu, waypoint, verticalWaypoint);
            }; // CLB SPD LIM
            mcdu.onRightInput[1] = () => {}; // RTA
            mcdu.onLeftInput[2] = async (value, scratchpadCallback) => {
                const speed = (value !== FMCMainDisplay.clrValue) ? parseInt(value) : 0;
                if (isFinite(speed)) {
                    if (speed >= 0) {
                        mcdu.flightPlanManager.setWaypointSpeed(speed, mcdu.flightPlanManager.indexOfWaypoint(waypoint), () => {
                            mcdu.updateConstraints();
                            this.ShowPage(mcdu, waypoint, verticalWaypoint);
                        });
                    }
                } else {
                    mcdu.addNewMessage(NXSystemMessages.notAllowed);
                    scratchpadCallback();
                }
            }; // SPD CSTR
            mcdu.onRightInput[2] = (value, scratchpadCallback) => {
                const PLUS_REGEX = /\+\d+/g;
                const MINUS_REGEX = /\-\d+/g;

                let altitude;
                let code;

                if (value !== FMCMainDisplay.clrValue) {
                    if (value.match(MINUS_REGEX)) {
                        code = 3;
                        altitude = value.split('-')[1];
                    } else if ((value.match(PLUS_REGEX))) {
                        code = 2;
                        altitude = value.split('+')[1];
                    } else {
                        code = 1;
                        altitude = value;
                    }
                    altitude = parseInt(altitude);
                } else {
                    altitude = 0;
                    code = 0;
                }
                if (isFinite(altitude)) {
                    if (altitude >= 0) {
                        // TODO Proper altitude constraints implementation - currently only cosmetic
                        mcdu.flightPlanManager.setLegAltitudeDescription(waypoint, code);
                        mcdu.flightPlanManager.setWaypointAltitude(altitude, mcdu.flightPlanManager.indexOfWaypoint(waypoint), () => {
                            mcdu.updateConstraints();
                            this.ShowPage(mcdu, waypoint, verticalWaypoint);
                        });
                    }
                } else {
                    mcdu.addNewMessage(NXSystemMessages.notAllowed);
                    scratchpadCallback();
                }
            }; // ALT CSTR
            mcdu.onLeftInput[4] = () => {
                //TODO: show appropriate wind page based on waypoint
                CDUWindPage.Return = () => {
                    CDUVerticalRevisionPage.ShowPage(mcdu, waypoint, verticalWaypoint);
                };
                CDUWindPage.ShowPage(mcdu);
            }; // WIND
            mcdu.onRightInput[4] = () => {}; // STEP ALTS
            mcdu.onLeftInput[5] = () => {
                CDUFlightPlanPage.ShowPage(mcdu);
            };
        }
    }

    static formatFl(constraint, transAlt) {
        if (transAlt >= 100 && constraint > transAlt) {
            return "FL" + Math.round(constraint / 100);
        }
        return constraint;
    }

    static formatAltErrorTitleAndValue(waypoint, verticalWaypoint) {
        const empty = ["", ""];

        if (!waypoint || !verticalWaypoint) {
            return empty;
        }

        // No constraint
        if (waypoint.legAltitudeDescription === 0 || verticalWaypoint.isAltitudeConstraintMet) {
            return empty;
        }

        // Weird prediction error
        if (!isFinite(verticalWaypoint.altError)) {
            return empty;
        }

        let formattedAltError = (Math.round(verticalWaypoint.altError / 10) * 10).toFixed(0);
        if (verticalWaypoint.altError > 0) {
            formattedAltError = "+" + formattedAltError;
        }

        return ["ALT ERROR\xa0", "{green}{small}" + formattedAltError + "{end}{end}"];
    }
}
