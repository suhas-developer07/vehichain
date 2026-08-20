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
    function registerVehicle(
        string calldata _vin,
        string calldata _make,
        string calldata _model,
        uint16 _year
    ) external {
        require(bytes(_vin).length > 0, "VIN cannot be empty");
        require(!vehicles[_vin].exists, "VIN already registered");

        vehicles[_vin] = Vehicle({
            vin: _vin,
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
        return vehicles[_vin];
    }

    function getHistory(string calldata _vin) external view returns (Record[] memory) {
        return vehicleHistory[_vin];
    }

    function getMyRole() external view returns (Role) {
        return roles[msg.sender];
    }
}
