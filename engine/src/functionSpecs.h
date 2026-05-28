#pragma once
#ifndef FUNCTION_SPECS_H
#define FUNCTION_SPECS_H

#include "mapping.h"
#include "deliveryRoutes.h"

EXPORT void initializeTrucks(struct TruckInfo trucks[]);

/**
 * @brief Finds the best truck for a shipment.
 *
 * This function finds the best truck for a shipment by considering the load on the truck,
 * the size and weight of the shipment, and the route of the truck to try to place it on a truck
 * which goes closest to the destination. If no truck can take the shipment, it returns -1.
 *
 * @param map The map of the delivery area with buildings on it.
 * @param trucks An array of trucks including the route for each of the trucks.
 * @param numTrucks The number of trucks in the array of trucks.
 * @param shipment A data structure containing the size and weight of the shipment.
 * @return An integer representing the index of the truck in the trucks array on which the shipment should be placed. If no truck can take the shipment, then -1 is returned.
 */
EXPORT int findTruckForShipment(
    struct Map map,
    struct TruckInfo trucks[],
    int numTrucks,
    struct ShipmentInfo shipment
);

/**
 * @brief Checks if a truck has enough capacity to carry a shipment.
 *
 * This function checks if a specified truck has sufficient remaining capacity
 * (weight and volume) to carry a shipment. It compares the truck's current load
 * with its maximum allowed limits.
 *
 * @param truck A pointer to the truck being checked for capacity.
 * @param shipment A pointer to the shipment to be delivered.
 * @return An integer: 1 if the truck can carry the shipment, 0 otherwise.
 */
int canTruckCarryShipment(
    const struct TruckInfo* truck,
    const struct ShipmentInfo* shipment
);


/**
 * @brief Calculates a diversion path for a truck.
 *
 * This function calculates the diversion path for a truck if it needs to deviate from
 * its main route to reach the destination. It uses the A* algorithm to find the shortest path
 * without intersecting buildings and returns the resulting diversion route.
 *
 * @param map The map with buildings and route information.
 * @param start The starting point on the truck’s route closest to the shipment destination.
 * @param dest The destination point where the shipment needs to be delivered.
 * @return A struct DiversionPath containing the points on the diversion route to the destination.
 *         If no valid route exists, returns an empty path with numPoints set to 0.
 */
EXPORT struct Route calculateDiversionPath(
    const struct Map* map,
    const struct Point start,
    const struct Point dest
);

/**
 * @brief Updates the load information for a truck after assigning a shipment.
 *
 * This function updates the truck’s current weight and volume after it has been assigned a shipment.
 * It adds the shipment’s weight and volume to the truck’s current load.
 *
 * @param truck A pointer to the truck to which the shipment has been assigned.
 * @param shipment A pointer to the shipment being loaded onto the truck.
 * @return void
 */
void truckLoadUpdate(
    struct TruckInfo* truck,
    const struct ShipmentInfo* shipment
);


/**
 * Calculates truck fullness percentage.
 * Lower value means more available space.
 */
double getTruckLoadFactor(
    const struct TruckInfo* truck
);

#endif // FUNCTION_SPECS_H