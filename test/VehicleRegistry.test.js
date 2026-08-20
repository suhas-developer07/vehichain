const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VehicleRegistry", function () {
  let VehicleRegistry;
  let vehicleRegistry;
  let admin, owner, serviceCenter, insurance, government, buyer, random;

  beforeEach(async function () {
    [admin, owner, serviceCenter, insurance, government, buyer, random] =
      await ethers.getSigners();

    VehicleRegistry = await ethers.getContractFactory("VehicleRegistry");
    vehicleRegistry = await VehicleRegistry.deploy();
    await vehicleRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the deployer as admin", async function () {
      expect(await vehicleRegistry.admin()).to.equal(admin.address);
    });

    it("should assign GOVERNMENT role to admin", async function () {
      expect(await vehicleRegistry.roles(admin.address)).to.equal(4); // Role.GOVERNMENT = 4
    });
  });

  describe("Vehicle Registration", function () {
    it("should register a vehicle and emit VehicleRegistered event", async function () {
      const tx = await vehicleRegistry
        .connect(owner)
        .registerVehicle("VIN123", "Toyota", "Camry", 2020);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          return vehicleRegistry.interface.parseLog(log)?.name === "VehicleRegistered";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const vehicle = await vehicleRegistry.getVehicle("VIN123");
      expect(vehicle.vin).to.equal("VIN123");
      expect(vehicle.make).to.equal("Toyota");
      expect(vehicle.model).to.equal("Camry");
      expect(vehicle.year).to.equal(2020);
      expect(vehicle.currentOwner).to.equal(owner.address);
      expect(vehicle.exists).to.be.true;
    });

    it("should revert on duplicate VIN", async function () {
      await vehicleRegistry
        .connect(owner)
        .registerVehicle("VIN123", "Toyota", "Camry", 2020);

      await expect(
        vehicleRegistry
          .connect(owner)
          .registerVehicle("VIN123", "Honda", "Civic", 2021)
      ).to.be.revertedWith("VIN already registered");
    });

    it("should revert on empty VIN", async function () {
      await expect(
        vehicleRegistry
          .connect(owner)
          .registerVehicle("", "Toyota", "Camry", 2020)
      ).to.be.revertedWith("VIN cannot be empty");
    });
  });

  describe("Role Assignment", function () {
    it("should allow admin to assign roles", async function () {
      await vehicleRegistry
        .connect(admin)
        .assignRole(serviceCenter.address, 2); // Role.SERVICE_CENTER = 2

      expect(await vehicleRegistry.roles(serviceCenter.address)).to.equal(2);
    });

    it("should revert if non-admin tries to assign roles", async function () {
      await expect(
        vehicleRegistry
          .connect(random)
          .assignRole(serviceCenter.address, 2)
      ).to.be.revertedWith("Not admin");
    });
  });

  describe("Add Record", function () {
    beforeEach(async function () {
      // Register a vehicle
      await vehicleRegistry
        .connect(owner)
        .registerVehicle("VIN123", "Toyota", "Camry", 2020);

      // Assign service center role
      await vehicleRegistry
        .connect(admin)
        .assignRole(serviceCenter.address, 2); // SERVICE_CENTER
    });

    it("should revert when caller has no authorized role", async function () {
      await expect(
        vehicleRegistry
          .connect(random)
          .addRecord("VIN123", 0, "hash123", "Regular service")
      ).to.be.revertedWith("Unauthorized role");
    });

    it("should allow SERVICE_CENTER to add a record", async function () {
      const tx = await vehicleRegistry
        .connect(serviceCenter)
        .addRecord("VIN123", 0, "hash123", "Regular service");

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          return vehicleRegistry.interface.parseLog(log)?.name === "RecordAdded";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const history = await vehicleRegistry.getHistory("VIN123");
      expect(history.length).to.equal(1);
      expect(history[0].recordType).to.equal(0); // SERVICE
      expect(history[0].dataHash).to.equal("hash123");
      expect(history[0].description).to.equal("Regular service");
      expect(history[0].recordedBy).to.equal(serviceCenter.address);
    });

    it("should allow INSURANCE to add a record", async function () {
      await vehicleRegistry
        .connect(admin)
        .assignRole(insurance.address, 3); // INSURANCE

      await vehicleRegistry
        .connect(insurance)
        .addRecord("VIN123", 2, "hash456", "Insurance claim");

      const history = await vehicleRegistry.getHistory("VIN123");
      expect(history.length).to.equal(1);
      expect(history[0].recordType).to.equal(2); // INSURANCE
    });

    it("should revert for non-existent vehicle", async function () {
      await expect(
        vehicleRegistry
          .connect(serviceCenter)
          .addRecord("NONEXISTENT", 0, "hash123", "Service")
      ).to.be.revertedWith("Vehicle not found");
    });
  });

  describe("Transfer Ownership", function () {
    beforeEach(async function () {
      await vehicleRegistry
        .connect(owner)
        .registerVehicle("VIN123", "Toyota", "Camry", 2020);
    });

    it("should revert if caller is not current owner", async function () {
      await expect(
        vehicleRegistry
          .connect(random)
          .transferOwnership("VIN123", buyer.address)
      ).to.be.revertedWith("Not the current owner");
    });

    it("should transfer ownership and emit event", async function () {
      const tx = await vehicleRegistry
        .connect(owner)
        .transferOwnership("VIN123", buyer.address);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          return vehicleRegistry.interface.parseLog(log)?.name === "OwnershipTransferred";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const vehicle = await vehicleRegistry.getVehicle("VIN123");
      expect(vehicle.currentOwner).to.equal(buyer.address);

      // Should also add an ownership transfer record
      const history = await vehicleRegistry.getHistory("VIN123");
      expect(history.length).to.equal(1);
      expect(history[0].recordType).to.equal(3); // OWNERSHIP_TRANSFER
    });
  });

  describe("Get History", function () {
    it("should return empty array for unregistered VIN", async function () {
      const history = await vehicleRegistry.getHistory("NONEXISTENT");
      expect(history.length).to.equal(0);
    });
  });

  describe("Get Vehicle", function () {
    it("should revert for unregistered VIN", async function () {
      await expect(vehicleRegistry.getVehicle("NONEXISTENT")).to.be.revertedWith(
        "Vehicle not found"
      );
    });
  });

  describe("getMyRole", function () {
    it("should return NONE for unassigned account", async function () {
      expect(await vehicleRegistry.connect(random).getMyRole()).to.equal(0); // Role.NONE
    });

    it("should return correct role after assignment", async function () {
      await vehicleRegistry
        .connect(admin)
        .assignRole(serviceCenter.address, 2); // SERVICE_CENTER

      expect(await vehicleRegistry.connect(serviceCenter).getMyRole()).to.equal(2);
    });
  });
});
