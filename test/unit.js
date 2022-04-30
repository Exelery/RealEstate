//npx hardhat test

const { expect } = require("chai");
const { ethers, hardhatArguments } = require("hardhat");

describe("RealEstate", function () {
  let RealEstate
  let hhRealEstate
  let owner
  let admin1, admin2, admin3, user1, user2, user3, newUser;
  let zeroAddres = "0x0000000000000000000000000000000000000000"

  beforeEach(async() => {
    [owner, admin1, admin2, admin3, user1, user2, user3, newUser] = await ethers.getSigners()

    RealEstate = await ethers.getContractFactory("RealEstate", owner)
    hhRealEstate = await RealEstate.deploy([admin1.address, admin2.address, admin3.address],
       [user1.address, user2.address, user3.address])
    await hhRealEstate.deployed()
    console.log(hhRealEstate.address)
  })

  describe("Deployment", async() =>{
    it("Should set the right owner", async function () {
      let isOwner = await hhRealEstate.owner()
      console.log(isOwner)
   expect( await hhRealEstate.owner()).to.equal(owner.address)
    }) 

    it("Should check the correct object", async() =>{
      expect( await hhRealEstate.objectId()).to.eq(2)

      console.log((await hhRealEstate.showObject(1)).toString())
      expect((await hhRealEstate.showObject(1)).toString()).to.eq([user1.address, 40, 33].toString())
    })
  })

  describe("Testing main functional", async() => {
    it("Should create new object", async() => {
      await hhRealEstate.createObject(user1.address, 66, 60)

      console.log((await hhRealEstate.showUserObjects(user1.address)).toString())
      expect((await hhRealEstate.showUserObjects(user1.address)).toString()).to.eq([1,3].toString())

      expect((await hhRealEstate.showObject(3)).toString()).to.eq([user1.address, 66, 60].toString())
    })

    it("should revert because user is not ADMIN", async()=> {
      await expect(hhRealEstate.connect(user1).createObject(user1.address, 66, 60)).to.be.revertedWith("You have no permission")
    })

    it("should revert because incorrect input", async()=> {
      await expect(hhRealEstate.createObject(user1.address, 50, 60)).to.be.revertedWith("The total Area should be more than living Area")
    })

    it("Create Admin should revert because user is not Owner", async()=> {
      await expect(hhRealEstate.connect(user1).createAdmin(user1.address)).to.be.revertedWith("You are not owner")
    })

    it("Should register new user", async() =>{
      await hhRealEstate.connect(newUser).registration()
      console.log((await hhRealEstate.showPerson(newUser.address)).toString() )
      expect((await hhRealEstate.showPerson(newUser.address)).toString()).to.eq([, 2, 130, 0].toString())
    })

    it("Should revert change Admin role", async() =>{ 
      await expect( hhRealEstate.connect(admin3).createUser(admin1.address)).to.be.revertedWith("You can't delete admin")
    })

    it("Should create new user", async() =>{
      await expect( hhRealEstate.connect(admin3).createUser(newUser.address)).to.emit(hhRealEstate, "NewUser").withArgs(newUser.address, 2, 130)
    })


  })

  describe("Deal", async()=> {
    it("should create new deal", async() => {
      const tx = await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
  //    await tx.wait()
   //   console.log(tx)
      const data = (await ethers.provider.getBlock(tx.blockNumber)).timestamp
      await expect( tx).to.emit(hhRealEstate, "NewDeal").withArgs(user1.address, 1, 30, data )
      console.log ( (await ethers.provider.getBlock(tx.blockNumber)).timestamp)
      expect(await hhRealEstate.checkDealActive(1)).to.eq(true)

//      console.log ( (await ethers.provider.getBlock("latest")).timestamp)
    })

    it("should revert because deal is alredy exist", async() => {
      await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      await expect(hhRealEstate.connect(user1).createSale(1, 30, 60*10)).to.be.revertedWith("The deal with that item is already exist")
    })
    it("should revert because you are not an owner", async() => {
      await expect(hhRealEstate.connect(user1).createSale(10, 30, 60*10)).to.be.revertedWith("You are not the owner of this item")
    })

    it("buyer should create proposal", async()=>{
      await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      await hhRealEstate.connect(user3).proposal(1)
      await expect( (await hhRealEstate.showPerson(user3.address))[2]).to.eq(130-30)
      expect((await hhRealEstate.showDeal(1))[4]).to.eq(user3.address)
    })
    it("seller should confirm Sale and buyer get object", async() => {
      await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      await hhRealEstate.connect(user3).proposal(1)
      await hhRealEstate.connect(user1).confirmSale(1)
      expect( (await hhRealEstate.showPerson(user1.address)).toString()).to.eq([, 2, 130+30, 0].toString())
      expect( (await hhRealEstate.showPerson(user3.address)).toString()).to.eq([[1], 2, 130-30, 1].toString())
      expect((await hhRealEstate.showObject(1))[0]).to.eq(user3.address)
      expect(await hhRealEstate.checkDealActive(1)).to.eq(false)
    })

    it("seller should cancel deal", async() => {
      await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      await hhRealEstate.connect(user3).proposal(1)
      await hhRealEstate.connect(user1).cancelDeal(1)
      expect((await hhRealEstate.showPerson(user3.address))[2]).to.eq(130)
      expect(await hhRealEstate.checkDealActive(1)).to.eq(false)
    })

    it("buyer should cansel proposal", async() => {
      await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      await hhRealEstate.connect(user3).proposal(1)
      await ethers.provider.send('evm_increaseTime', [60*11])
      console.log(await hhRealEstate.getAllActiveDeals())
      await hhRealEstate.connect(user3).cashBack(1)
      console.log(await hhRealEstate.getAllActiveDeals())
      expect((await hhRealEstate.showPerson(user3.address))[2]).to.eq(130)
      expect((await hhRealEstate.showDeal(1))[4]).to.eq(zeroAddres)

    })
    it("should be reverted because seller already cancel the deal", async() => {
      await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      console.log(await hhRealEstate.getAllActiveDeals())
      await hhRealEstate.connect(user1).cancelDeal(1)
      console.log(await hhRealEstate.getAllActiveDeals())
      
      await ethers.provider.send('evm_increaseTime', [60*11])
      await expect(hhRealEstate.connect(user1).cancelDeal(1)).to.be.revertedWith("The deal is not active")
      await expect(hhRealEstate.connect(user3).cashBack(1)).to.be.revertedWith("The deal is not active")
      await expect(hhRealEstate.connect(user3).proposal(1)).to.be.revertedWith("The deal is not active")
    })

    it("should be reverted because deal is not ended and not buyer", async() => {
      await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      await hhRealEstate.connect(user3).proposal(1)
//      let allActiveDeals = await hhRealEstate.allActiveDeals()
      console.log(await hhRealEstate.getAllActiveDeals())
      await expect(hhRealEstate.connect(user3).cashBack(1)).to.be.revertedWith("The deal is still active")
      await expect(hhRealEstate.connect(user2).cashBack(1)).to.be.revertedWith("You are not the buyer")
      console.log(await hhRealEstate.getAllActiveDeals())
    })
  })
  describe("other function", async()=> {
      it("should show all user's objects", async()=>{
      await hhRealEstate.createObject(user2.address, 70, 60)
 //     console.log( (await hhRealEstate.connect(user2).showAllMyObject()).toString())
      expect((await hhRealEstate.connect(user2).showAllMyObject()).toString()).to.eq([user2.address, 100, 79, user2.address, 70, 60].toString())
    })
    it("should show all active deal of user", async()=>{
      await hhRealEstate.createObject(user1.address, 70, 60)
      const tx = await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      await hhRealEstate.connect(user1).createSale(3, 40, 60*10)
      await hhRealEstate.connect(user1).cancelDeal(3)

      const data = (await ethers.provider.getBlock(tx.blockNumber)).timestamp

      console.log(await hhRealEstate.checkDealActive(1))
      console.log(await hhRealEstate.getAllActiveDeals())
//      console.log( (await hhRealEstate.connect(user1).showAllActiveSale()).toString())
      expect ((await hhRealEstate.connect(user1).showAllActiveSale()).toString()).to.eq([1,30,data,data+60*10,zeroAddres,true].toString())
    })

    it("should show all active proposal of user", async()=>{
      await hhRealEstate.createObject(user1.address, 70, 60)
      await hhRealEstate.connect(user2).createSale(2, 40, 70*10)

      const tx = await hhRealEstate.connect(user1).createSale(1, 30, 60*10)
      const data = (await ethers.provider.getBlock(tx.blockNumber)).timestamp
      await hhRealEstate.connect(user3).proposal(1)
      console.log( await hhRealEstate.connect(user3).showAllActiveBuyer())
      expect ((await hhRealEstate.connect(user3).showAllActiveBuyer()).toString()).to.eq([1,30,data,data+60*10,user3.address,true].toString())
    })
  })



})
