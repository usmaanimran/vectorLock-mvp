#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h> // Added for abs() in pathfinding
#include "mapping.h"
#include "math.h"

struct Map populateMap()
{
    struct Map result = {
        //0 1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4
        //A B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y
        {
        {0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //0
        {0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0},    //1
        {0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0},    //2
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //3
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //4
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //5
        {1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0},    //6
        {1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1},    //7
        {0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1},    //8
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //9
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //10
        {1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1},    //11
        {1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1},    //12
        {1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1},    //13
        {1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1},    //14
        {1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1},    //15
        {0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //16
        {0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //17
        {0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},    //18
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //19
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},    //20
        {0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0},    //21
        {0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1},    //22
        {0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1},    //23
        {0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}     //24
        },
        MAP_ROWS, MAP_COLS
    };
    return result;
}

int getNumRows(const struct Map* map)
{
    return map->numRows;
}

int getNumCols(const struct Map* map)
{
    return map->numCols;
}

void printMap(const struct Map* map, const int base1, const int alphaCols)
{
    char sym[] = { " XB?G?.?Y?-?*?+?P" };
    int r, c, rowMax;

    rowMax = map->numRows + base1;

    printf("%4s", " ");
    for (c = 0; c < map->numCols; c++)
    {
        if (alphaCols) printf("%c", 'A' + c);
        else printf("%d", c % 10);
    }
    printf("\n");
    printf("%4s", " ");
    for (c = 0; c < map->numCols; c++)
    {
        printf("-");
    }
    printf("\n");

    for (r = base1; r < rowMax; r++)
    {
        printf("%3d|", r);
        for (c = 0; c < map->numCols; c++)
        {
            printf("%c", sym[map->squares[r - base1][c]]);
        }
        printf("\n");
    }
}

struct Route getBlueRoute()
{
    struct Route result = {
        {
            {0, 0}, {1, 0}, {2, 0}, {3, 0},
            {4, 0}, {4, 1}, {4, 2}, {4, 3}, {4, 4}, {4, 5}, {4, 6}, {4, 7}, {4, 8},{4, 9},
            {5, 9}, {6, 9}, {7, 9}, {8, 9}, {9, 9}, {10, 9},{10, 10},
            {11, 10}, {12, 10}, {13, 10}, {14, 10}, {15, 10}, {16, 10},
            {17, 10},{17, 11},{17, 12},{17, 13},{17, 14},{17, 15},{17, 16},{17, 17},{17, 18},{17, 19},{17, 20},
            {17, 21},{17, 22},{17, 23},{17, 24},
        },
            42, BLUE
    };
    return result;
}

struct Route getGreenRoute()
{
    struct Route result = {
        {
            {0, 0}, {1, 0}, {2, 0}, {3, 0},
            {4, 0}, {4, 1}, {4, 2}, {4, 3}, {4, 4}, {4, 5}, {4, 6}, {4, 7}, {4, 8},{4, 9},{4, 10},{4, 11},
            {3, 11}, {2, 11}, {1, 11},
            {0, 11},{0, 12},{0, 13},{0, 14},{0, 15},{0, 16},{0, 17},{0, 18},{0, 19},
            {1, 19}, {2, 19}, {3, 19}, {4, 19}, {5, 19}, {6, 19}, {7, 19}, {8, 19},
            {9, 19},{9, 20},{9, 21},{9, 22},{9, 23},{9, 24}
        },
            42, GREEN
    };
    return result;
}

struct Route getYellowRoute()
{
    struct Route result = {
        {
            {0, 0}, {1, 0}, {2, 0}, {3, 0},
            {4, 0}, {4, 1}, {4, 2}, {4, 3},
            {5, 3}, {6, 3}, {7, 3}, {8, 3},
            {9, 3},{9, 2},{9, 1},
            {10, 1}, {11, 1}, {12, 1}, {13, 1}, {14, 1}, {15, 1}, {16, 1}, {17, 1}, {18, 1},
            {19, 1},{19, 2},{19, 3},{19, 4},{19, 5},{19, 6},{19, 7},{19, 8},{19, 9},{19, 10},{19, 11},{19, 12},
            {19, 13},{19, 14},{19, 15},{19, 16},{19, 17},{19, 18},{19, 19},{19, 20},{19, 21},{19, 22},{19, 23},{19, 24}
        },
            48, YELLOW
    };
    return result;
}

struct Map addRoute(const struct Map* map, const struct Route* route)
{
    int r, c;
    struct Map result = { {0}, 0 };

    for (r = 0; r < map->numRows; r++)
    {
        for (c = 0; c < map->numCols; c++)
        {
            result.squares[r][c] = map->squares[r][c];
        }
    }
    result.numRows = map->numRows;
    result.numCols = map->numCols;

    for (r = 0; r < route->numPoints; r++)
    {
        result.squares[route->points[r].row][route->points[r].col] += route->routeSymbol;
    }

    return result;
}

void addPtToRoute(struct Route* route, struct Point pt)
{
    route->points[route->numPoints++] = pt;
}

void addPointToRoute(struct Route* route, const int row, const int col)
{
    struct Point pt = { row, col };
    addPtToRoute(route, pt);
}

void addPointToRouteIfNot(struct Route* route, const int row, const int col, const struct Point notThis)
{
    struct Point pt = { row, col };
    if (notThis.row != row || notThis.col != col) addPtToRoute(route, pt);
}

double distance(const struct Point* p1, const struct Point* p2)
{
    int deltaRow = p2->row - p1->row;
    int deltaCol = p2->col - p1->col;

    return sqrt((double)(deltaRow * deltaRow + deltaCol * deltaCol));
}



// Helper function to calculate exact integer distance 
int calculateHCost(struct Point p1, struct Point p2) {
    int distX = abs(p1.col - p2.col);
    int distY = abs(p1.row - p2.row);
    if (distX > distY)
        return 14 * distY + 10 * (distX - distY);
    return 14 * distX + 10 * (distY - distX);
}

struct Route shortestPath(const struct Map* map, const struct Point start, const struct Point dest)
{
    struct Route result = { {{0,0}}, 0, DIVERSION };

    if (eqPt(start, dest)) return result;

    // A* Tracking Arrays using Integers
    int gCost[MAP_ROWS][MAP_COLS];
    int fCost[MAP_ROWS][MAP_COLS];
    struct Point parent[MAP_ROWS][MAP_COLS];
    int openSet[MAP_ROWS][MAP_COLS];
    int closedSet[MAP_ROWS][MAP_COLS];

    // Initialize arrays
    for(int r = 0; r < MAP_ROWS; r++) {
        for(int c = 0; c < MAP_COLS; c++) {
            gCost[r][c] = 999999;
            fCost[r][c] = 999999;
            openSet[r][c] = 0;
            closedSet[r][c] = 0;
            parent[r][c] = (struct Point){-1, -1};
        }
    }

    // Setup Start Node
    gCost[start.row][start.col] = 0;
    fCost[start.row][start.col] = calculateHCost(start, dest);
    openSet[start.row][start.col] = 1;

    // 8-way movement (Orthogonal & Diagonal)
    int dRow[] = {-1, -1, -1, 0, 0, 1, 1, 1};
    int dCol[] = {-1, 0, 1, -1, 1, -1, 0, 1};

    int found = 0;

    while(1) {
        // Find node in openSet with lowest fCost
        int current_r = -1;
        int current_c = -1;
        int lowestF = 999999;

        for(int r = 0; r < map->numRows; r++) {
            for(int c = 0; c < map->numCols; c++) {
                if(openSet[r][c] && fCost[r][c] < lowestF) {
                    lowestF = fCost[r][c];
                    current_r = r;
                    current_c = c;
                }
            }
        }

        // If open set is empty, no path exists
        if(current_r == -1) break; 

        struct Point curr = {current_r, current_c};

        // Destination reached
        if(eqPt(curr, dest)) {
            found = 1;
            break;
        }

        openSet[current_r][current_c] = 0;
        closedSet[current_r][current_c] = 1;

        // Determine current direction (for the turn penalty)
        int currDirR = 0;
        int currDirC = 0;
        if (parent[current_r][current_c].row != -1) {
            currDirR = current_r - parent[current_r][current_c].row;
            currDirC = current_c - parent[current_r][current_c].col;
        }

        for(int i = 0; i < 8; i++) {
            int neighbor_r = current_r + dRow[i];
            int neighbor_c = current_c + dCol[i];

            // Map Bounds Check
            if(neighbor_r >= 0 && neighbor_r < map->numRows && neighbor_c >= 0 && neighbor_c < map->numCols) {
                
                // Traffic/Building Check (1 = Blocked)
                if(map->squares[neighbor_r][neighbor_c] == 1 || closedSet[neighbor_r][neighbor_c]) {
                    continue;
                }

                // Prevent "cutting corners" through diagonal gaps between two buildings
                if (dRow[i] != 0 && dCol[i] != 0) {
                    if (map->squares[current_r + dRow[i]][current_c] == 1 || 
                        map->squares[current_r][current_c + dCol[i]] == 1) {
                        continue;
                    }
                }

                // Move cost: 10 for straight, 14 for diagonal
                int moveCost = (dRow[i] == 0 || dCol[i] == 0) ? 10 : 14;

                // Turn Penalty: Add cost if the truck has to change direction
                int turnPenalty = 0;
                if (currDirR != 0 || currDirC != 0) { 
                    if (currDirR != dRow[i] || currDirC != dCol[i]) {
                        turnPenalty = 10; // High penalty strongly favors straight lines over turning
                    }
                }

                int tentative_gCost = gCost[current_r][current_c] + moveCost + turnPenalty;

                if(!openSet[neighbor_r][neighbor_c] || tentative_gCost < gCost[neighbor_r][neighbor_c]) {
                    gCost[neighbor_r][neighbor_c] = tentative_gCost;
                    fCost[neighbor_r][neighbor_c] = tentative_gCost + calculateHCost((struct Point){neighbor_r, neighbor_c}, dest);
                    parent[neighbor_r][neighbor_c] = curr;

                    if(!openSet[neighbor_r][neighbor_c]) {
                        openSet[neighbor_r][neighbor_c] = 1;
                    }
                }
            }
        }
    }

    // Reconstruct the path backwards
    if(found) {
        struct Point temp[MAX_ROUTE];
        int count = 0;
        struct Point curr = dest;

        while(!eqPt(curr, start)) {
            if(count < MAX_ROUTE) temp[count++] = curr;
            curr = parent[curr.row][curr.col];
        }

        // Reverse into the result
        for(int i = count - 1; i >= 0; i--) {
            if(result.numPoints < MAX_ROUTE) addPtToRoute(&result, temp[i]);
        }
    }

    return result;
}

struct Route getPossibleMoves(const struct Map* map, const struct Point p1, const struct Point backpath)
{
    struct Route result = { {0,0}, 0, DIVERSION };

    if (p1.row > 0)
    {
        if (map->squares[p1.row - 1][p1.col] != 1) addPointToRouteIfNot(&result, p1.row - 1, p1.col, backpath); // square above
        if (p1.col > 0 && map->squares[p1.row - 1][p1.col - 1] != 1) addPointToRouteIfNot(&result, p1.row - 1, p1.col - 1, backpath);   // top left
        if (p1.col < (map->numCols - 1) && map->squares[p1.row - 1][p1.col + 1] != 1) addPointToRouteIfNot(&result, p1.row - 1, p1.col + 1, backpath);  // top right
    }
    if (p1.col > 0 && map->squares[p1.row][p1.col - 1] != 1)addPointToRouteIfNot(&result, p1.row, p1.col - 1, backpath);    // left
    if (p1.col < (map->numCols - 1) && map->squares[p1.row][p1.col + 1] != 1)addPointToRouteIfNot(&result, p1.row, p1.col + 1, backpath);   // right
    if (p1.row < (map->numRows - 1))
    {
        if (map->squares[p1.row + 1][p1.col] != 1) addPointToRouteIfNot(&result, p1.row + 1, p1.col, backpath); // square below
        if (p1.col > 0 && map->squares[p1.row + 1][p1.col - 1] != 1) addPointToRouteIfNot(&result, p1.row + 1, p1.col - 1, backpath);   // bot left
        if (p1.col < (map->numCols - 1) && map->squares[p1.row + 1][p1.col + 1] != 1) addPointToRouteIfNot(&result, p1.row + 1, p1.col + 1, backpath);  // top right
    }

    return result;
}

int eqPt(const struct Point p1, const struct Point p2)
{
    return p1.row == p2.row && p1.col == p2.col;
}

int getClosestPoint(const struct Route* route, const struct Point pt)
{
    int i, closestIdx = -1;
    double closestDist = 999999.99, dist;

    for (i = 0; i < route->numPoints; i++)
    {
        dist = distance(&pt, &route->points[i]);
        if (dist < closestDist)
        {
            closestDist = dist;
            closestIdx = i;
        }
    }
    return closestIdx;
}