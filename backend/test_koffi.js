const koffi = require('koffi');
const Point = koffi.struct('Point', { row: 'int8', col: 'int8' });
const ptr = koffi.alloc(Point, 3);
koffi.encode(ptr, koffi.array(Point, 3), [{row:1,col:2},{row:3,col:4},{row:5,col:6}]);
console.log(koffi.decode(ptr, koffi.array(Point, 3)));
