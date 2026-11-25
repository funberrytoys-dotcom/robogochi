// Bone name, parent, pivot X/Y, wind amplitude, artwork X/Y/width/height.
const elderParts = [
  ["roots", null, 520, 1480, 0, 6, 1296, 1014, 236],
  ["bole", "roots", 507, 1270, 0.05, 127, 536, 727, 841],
  ["leader", "bole", 497, 574, 0.18, 228, 213, 786, 399],
  ["crown-west", "leader", 436, 354, 0.43, 10, 76, 459, 340],
  ["west-leaves", "crown-west", 295, 237, 1.05, 8, 76, 316, 279],
  ["crown-top", "leader", 525, 326, 0.44, 377, 74, 284, 240],
  ["crest", "crown-top", 473, 157, 0.78, 328, 4, 316, 154],
  ["crown-east", "leader", 622, 418, 0.39, 628, 46, 387, 470],
  ["east-leaves", "crown-east", 807, 298, 1.0, 791, 109, 225, 312],
  ["high-perch", "leader", 370, 431, 0.42, 10, 344, 372, 156],
  ["east-perch", "bole", 659, 680, 0.35, 621, 583, 259, 181],
  ["east-buds", "east-perch", 852, 657, 1.2, 850, 534, 159, 182],
  ["nursery", "bole", 369, 999, 0.23, 104, 902, 317, 195],
  ["nursery-tip", "nursery", 132, 969, 0.68, 8, 891, 148, 190],
  ["lower-perch", "bole", 594, 1105, 0.29, 567, 988, 321, 199],
  ["lower-buds", "lower-perch", 840, 1083, 0.88, 840, 980, 175, 147]
];
