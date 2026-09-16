// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VehicleRegistry {
    // --- Enums ---
    enum Role { NONE, OWNER, SERVICE_CENTER, INSURANCE, GOVERNMENT, BUYER }
    enum RecordType { SERVICE, ACCIDENT, INSURANCE, OWNERSHIP_TRANSFER, INSPECTION }

    // --- Structs ---
    struct Vehicle {
        string vin;
        string make;
        string model;
        uint16 year;
        address currentOwner;
        bool exists;
    }

    struct Record {
        RecordType recordType;
        string dataHash;
        string description;
        address recordedBy;
        uint256 timestamp;
    }

    // --- State ---
    address public admin;
    mapping(string => Vehicle) private vehicles;
    mapping(string => Record[]) private vehicleHistory;
    mapping(address => Role) public roles;

    // --- Events ---
    event VehicleRegistered(string vin, address indexed owner, uint256 timestamp);
    event RecordAdded(string vin, uint8 recordType, address indexed recordedBy, uint256 timestamp);
    event OwnershipTransferred(string vin, address indexed from, address indexed to, uint256 timestamp);
    event RoleAssigned(address indexed user, uint8 role);

    // --- Modifiers ---
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Unauthorized role");
        _;
    }

    // --- Constructor ---
    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.GOVERNMENT;
    }

    // --- Admin Functions ---
    function assignRole(address _user, Role _role) external onlyAdmin {
        roles[_user] = _role;
        emit RoleAssigned(_user, uint8(_role));
    }

    // --- Vehicle Registration ---
    // Gas optimization: `vin` is the mapping key, so we do NOT persist a second
    // copy of it in the Vehicle struct (~20k gas saved per registration).
    // The field stays in the struct/ABI for consumers; getVehicle() reconstructs it.
    function registerVehicle(
        string calldata _vin,
        string calldata _make,
        string calldata _model,
        uint16 _year
    ) external {
        require(bytes(_vin).length > 0, "VIN cannot be empty");
        require(!vehicles[_vin].exists, "VIN already registered");

        vehicles[_vin] = Vehicle({
            vin: "", // reconstructed in getVehicle(); not persisted
            make: _make,
            model: _model,
            year: _year,
            currentOwner: msg.sender,
            exists: true
        });

        // Assign OWNER role only if the caller has no role yet (NONE)
        if (roles[msg.sender] == Role.NONE) {
            roles[msg.sender] = Role.OWNER;
        }

        emit VehicleRegistered(_vin, msg.sender, block.timestamp);
    }

    // --- Add Record ---
    function addRecord(
        string calldata _vin,
        RecordType _type,
        string calldata _dataHash,
        string calldata _description
    ) external {
        require(vehicles[_vin].exists, "Vehicle not found");
        require(
            roles[msg.sender] == Role.SERVICE_CENTER ||
            roles[msg.sender] == Role.INSURANCE ||
            roles[msg.sender] == Role.GOVERNMENT,
            "Unauthorized role"
        );

        Record memory newRecord = Record({
            recordType: _type,
            dataHash: _dataHash,
            description: _description,
            recordedBy: msg.sender,
            timestamp: block.timestamp
        });

        vehicleHistory[_vin].push(newRecord);

        emit RecordAdded(_vin, uint8(_type), msg.sender, block.timestamp);
    }

    // --- Transfer Ownership ---
    function transferOwnership(string calldata _vin, address _newOwner) external {
        require(vehicles[_vin].exists, "Vehicle not found");
        require(vehicles[_vin].currentOwner == msg.sender, "Not the current owner");

        address previousOwner = vehicles[_vin].currentOwner;
        vehicles[_vin].currentOwner = _newOwner;

        // Append an ownership transfer record
        Record memory transferRecord = Record({
            recordType: RecordType.OWNERSHIP_TRANSFER,
            dataHash: "",
            description: "Ownership transferred",
            recordedBy: msg.sender,
            timestamp: block.timestamp
        });

        vehicleHistory[_vin].push(transferRecord);

        emit OwnershipTransferred(_vin, previousOwner, _newOwner, block.timestamp);
    }

    // --- View Functions ---
    function getVehicle(string calldata _vin) external view returns (Vehicle memory) {
        require(vehicles[_vin].exists, "Vehicle not found");
        Vehicle memory v = vehicles[_vin];
        v.vin = _vin; // VIN is the mapping key — rebuild it for consumers
        return v;
    }

    function getHistory(string calldata _vin) external view returns (Record[] memory) {
        return vehicleHistory[_vin];
    }

    /// @notice Cheap constant-gas read of a vehicle's history length.
    function getHistoryCount(string calldata _vin) external view returns (uint256) {
        return vehicleHistory[_vin].length;
    }

    /// @notice Bounded history read — keeps gas/latency flat no matter how long
    ///         the vehicle's history grows (unlike getHistory which is O(n)).
    function getHistoryPaged(
        string calldata _vin,
        uint256 _offset,
        uint256 _limit
    ) external view returns (Record[] memory page) {
        Record[] storage history = vehicleHistory[_vin];
        uint256 total = history.length;
        if (_offset >= total) return new Record[](0);
        uint256 end = _offset + _limit;
        if (end > total) end = total;
        page = new Record[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            page[i - _offset] = history[i];
        }
    }

    function getMyRole() external view returns (Role) {
        return roles[msg.sender];
    }
}
