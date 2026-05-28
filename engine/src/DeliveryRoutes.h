#pragma once
#ifndef DELIVERY_STRUCTURES_H
#define DELIVERY_STRUCTURES_H

#include "mapping.h"

#define MAXIMUM_VOLUME 20
#define MAXIMUM_WEIGHT 2000

struct TruckInfo
{
    char routeSymbol;
    int maxWeight;
    int maxVolume;
    int currentWeight;
    int currentVolume;
    struct Route route;
    struct Point currentLocation; 
};

struct ShipmentInfo
{
    int weight;
    int volume;
    struct Point destination;
};

#endif