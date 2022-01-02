import { TheoreticalDescentPathCharacteristics } from '@fmgc/guidance/vnav/descent/TheoreticalDescentPath';
import { NavGeometryProfile, VerticalCheckpointReason } from '@fmgc/guidance/vnav/profile/NavGeometryProfile';

export class DescentPathBuilder {
    computeDescentPath(profile: NavGeometryProfile): TheoreticalDescentPathCharacteristics {
        const TEMP_FUEL_BURN = 2000;

        const decelCheckpoint = profile.checkpoints.find((checkpoint) => checkpoint.reason === VerticalCheckpointReason.Decel);

        if (!decelCheckpoint) {
            return { tod: undefined, fuelBurnedDuringDescent: undefined, remainingFuelOnBoardAtTopOfDescent: undefined };
        }

        const cruiseAlt = SimVar.GetSimVarValue('L:AIRLINER_CRUISE_ALTITUDE', 'number');
        const verticalDistance = cruiseAlt - decelCheckpoint.altitude;
        const fpa = 3;

        if (DEBUG) {
            console.log(cruiseAlt);
            console.log(verticalDistance);
        }

        const tod = decelCheckpoint.distanceFromStart - (verticalDistance / Math.tan((fpa * Math.PI) / 180)) * 0.000164579;

        if (DEBUG) {
            console.log(`[FMS/VNAV] T/D: ${tod.toFixed(1)}nm`);
        }

        profile.checkpoints.push({
            reason: VerticalCheckpointReason.TopOfDescent,
            distanceFromStart: tod,
            speed: 290,
            remainingFuelOnBoard: decelCheckpoint.remainingFuelOnBoard + TEMP_FUEL_BURN,
            altitude: cruiseAlt,
        });

        return { tod, fuelBurnedDuringDescent: TEMP_FUEL_BURN, remainingFuelOnBoardAtTopOfDescent: decelCheckpoint.remainingFuelOnBoard + TEMP_FUEL_BURN };

        //     const decelPointDistance = DecelPathBuilder.computeDecelPath(geometry);
        //
        //     const lastLegIndex = geometry.legs.size - 1;
        //
        //     // Find descent legs before decel point
        //     let accumulatedDistance = 0;
        //     let currentLegIdx;
        //     let currentLeg;
        //     for (currentLegIdx = lastLegIndex; accumulatedDistance < decelPointDistance; currentLegIdx--) {
        //         currentLeg = geometry.legs.get(currentLegIdx);
        //
        //         accumulatedDistance += currentLeg.distance;
        //     }
        //     currentLegIdx--;
        //
        //     const geometricPath = GeomtricPathBuilder.buildGeometricPath(geometry, currentLegIdx);
        //
        //     console.log(geometricPath);
        //
        //     return { geometricPath };
        // }
    }
}
