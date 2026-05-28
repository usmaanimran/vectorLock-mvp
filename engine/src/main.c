#define _CRT_SECURE_NO_WARNINGS

#include <stdio.h>
#include <ctype.h>

#include "mapping.h"
#include "functionSpecs.h"
#include "deliveryRoutes.h"

#define NUM_TRUCKS 3

void initializeTrucks(struct TruckInfo trucks[])
{
    trucks[0].routeSymbol = BLUE;
    trucks[0].maxWeight = MAXIMUM_WEIGHT;
    trucks[0].maxVolume = MAXIMUM_VOLUME;
    trucks[0].currentWeight = 0;
    trucks[0].currentVolume = 0;
    trucks[0].route = getBlueRoute();

    trucks[1].routeSymbol = GREEN;
    trucks[1].maxWeight = MAXIMUM_WEIGHT;
    trucks[1].maxVolume = MAXIMUM_VOLUME;
    trucks[1].currentWeight = 0;
    trucks[1].currentVolume = 0;
    trucks[1].route = getGreenRoute();

    trucks[2].routeSymbol = YELLOW;
    trucks[2].maxWeight = MAXIMUM_WEIGHT;
    trucks[2].maxVolume = MAXIMUM_VOLUME;
    trucks[2].currentWeight = 0;
    trucks[2].currentVolume = 0;
    trucks[2].route = getYellowRoute();
}

int isValidDestination(
    struct Map map,
    struct Point destination)
{
    if (destination.row < 0 ||
        destination.row >= MAP_ROWS)
    {
        return 0;
    }

    if (destination.col < 0 ||
        destination.col >= MAP_COLS)
    {
        return 0;
    }

    if (map.squares
        [destination.row]
        [destination.col] != 1)
    {
        return 0;
    }

    return 1;
}

void printTruckLine(char routeSymbol)
{
    if (routeSymbol == BLUE)
    {
        printf("BLUE LINE");
    }
    else if (routeSymbol == GREEN)
    {
        printf("GREEN LINE");
    }
    else
    {
        printf("YELLOW LINE");
    }
}

void printDiversion(struct Route diversion)
{
    for (int i = 0;
        i < diversion.numPoints;
        i++)
    {
        printf("%d%c",
            diversion.points[i].row + 1,
            diversion.points[i].col + 'A');

        if (i < diversion.numPoints - 1)
        {
            printf(", ");
        }
    }

    printf("\n");
}

int main(void)
{
    struct Map baseMap = populateMap();

    struct Route blueRoute =
        getBlueRoute();

    struct Route greenRoute =
        getGreenRoute();

    struct Route yellowRoute =
        getYellowRoute();

    struct Map routeMap =
        addRoute(&baseMap,
            &blueRoute);

    routeMap =
        addRoute(&routeMap,
            &greenRoute);

    routeMap =
        addRoute(&routeMap,
            &yellowRoute);

    struct TruckInfo trucks[NUM_TRUCKS];

    initializeTrucks(trucks);

    printMap(&routeMap, 1, 1);

    printf("\n");
    printf("===================================\n");
    printf("   Seneca Polytechnic Deliveries\n");
    printf("===================================\n");

    while (1)
    {
        struct ShipmentInfo shipment;

        int row;
        char col;

        printf(
            "Enter shipment weight, "
            "box size and destination "
            "(0 0 x to stop): ");

        scanf("%d %d %d %c",
            &shipment.weight,
            &shipment.volume,
            &row,
            &col);

        if (shipment.weight == 0 &&
            shipment.volume == 0 &&
            tolower(col) == 'x')
        {
            break;
        }

        if (shipment.weight < 1 ||
            shipment.weight > 2000)
        {
            printf(
                "Invalid weight "
                "(must be 1-2000 Kg.)\n");

            continue;
        }

        if (shipment.volume != 1 &&
            shipment.volume != 2 &&
            shipment.volume != 5)
        {
            printf("Invalid size\n");
            continue;
        }

        shipment.destination.row =
            row - 1;

        shipment.destination.col =
            toupper(col) - 'A';

        if (!isValidDestination(
            baseMap,
            shipment.destination))
        {
            printf(
                "Invalid destination\n");

            continue;
        }

        int bestTruck =
            findTruckForShipment(
                baseMap,
                trucks,
                NUM_TRUCKS,
                shipment);

        if (bestTruck == -1)
        {
            printf(
                "Ships tomorrow\n");

            continue;
        }

        int closestPointIndex =
            getClosestPoint(
                &trucks[bestTruck].route,
                shipment.destination);

        struct Point startPoint =
            trucks[bestTruck]
            .route
            .points[closestPointIndex];

        struct Route diversion =
            calculateDiversionPath(
                &baseMap,
                startPoint,
                shipment.destination);

        truckLoadUpdate(
            &trucks[bestTruck],
            &shipment);

        printf("Ship on ");

        printTruckLine(
            trucks[bestTruck]
            .routeSymbol);

        if (diversion.numPoints == 0)
        {
            printf(
                ", no diversion\n");
        }
        else
        {
            printf(", divert: ");

            printDiversion(diversion);
        }
    }

    printf(
        "Thanks for shipping "
        "with us!\n");

    return 0;
}