#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include "functionSpecs.h"

void initializeTrucks(struct TruckInfo trucks[])
{
    trucks[0].routeSymbol = BLUE;
    trucks[0].maxWeight = MAXIMUM_WEIGHT;
    trucks[0].maxVolume = MAXIMUM_VOLUME;
    trucks[0].currentWeight = 0;
    trucks[0].currentVolume = 0;
    trucks[0].route = getBlueRoute();
    trucks[0].currentLocation = trucks[0].route.points[0];

    trucks[1].routeSymbol = GREEN;
    trucks[1].maxWeight = MAXIMUM_WEIGHT;
    trucks[1].maxVolume = MAXIMUM_VOLUME;
    trucks[1].currentWeight = 0;
    trucks[1].currentVolume = 0;
    trucks[1].route = getGreenRoute();
    trucks[1].currentLocation = trucks[1].route.points[0];

    trucks[2].routeSymbol = YELLOW;
    trucks[2].maxWeight = MAXIMUM_WEIGHT;
    trucks[2].maxVolume = MAXIMUM_VOLUME;
    trucks[2].currentWeight = 0;
    trucks[2].currentVolume = 0;
    trucks[2].route = getYellowRoute();
    trucks[2].currentLocation = trucks[2].route.points[0];
}

double getTruckLoadFactor(const struct TruckInfo* truck)
{
    double weightFactor = (double)truck->currentWeight / truck->maxWeight;
    double volumeFactor = (double)truck->currentVolume / truck->maxVolume;
    return (weightFactor > volumeFactor) ? weightFactor : volumeFactor;
}

int canTruckCarryShipment(const struct TruckInfo* truck, const struct ShipmentInfo* shipment)
{
    if ((truck->currentWeight + shipment->weight) > truck->maxWeight) return 0;
    if ((truck->currentVolume + shipment->volume) > truck->maxVolume) return 0;
    return 1;
}

struct Route calculateDiversionPath(const struct Map* map, const struct Point start, const struct Point dest)
{
    return shortestPath(map, start, dest);
}

int findTruckForShipment(struct Map map, struct TruckInfo trucks[], int numTrucks, struct ShipmentInfo shipment)
{
    int bestTruckIndex = -1;
    int shortestDistance = 999999;

    for (int i = 0; i < numTrucks; i++)
    {
        if (!canTruckCarryShipment(&trucks[i], &shipment)) continue;

        // Calculate distance from truck's exact current location
        struct Route diversion = shortestPath(&map, trucks[i].currentLocation, shipment.destination);
        int diversionDistance = diversion.numPoints;

        // If no route exists and we are not already at the destination, the target is blocked
        if (diversionDistance == 0 && !eqPt(trucks[i].currentLocation, shipment.destination)) continue;

        if (bestTruckIndex == -1 || diversionDistance < shortestDistance)
        {
            bestTruckIndex = i;
            shortestDistance = diversionDistance;
        }
        else if (diversionDistance == shortestDistance)
        {
            // Tie-breaker based on current capacity
            double currentTruckFactor = getTruckLoadFactor(&trucks[i]);
            double bestTruckFactor = getTruckLoadFactor(&trucks[bestTruckIndex]);

            if (currentTruckFactor < bestTruckFactor) bestTruckIndex = i;
        }
    }

    return bestTruckIndex;
}

void truckLoadUpdate(struct TruckInfo* truck, const struct ShipmentInfo* shipment)
{
    truck->currentWeight += shipment->weight;
    truck->currentVolume += shipment->volume;
}