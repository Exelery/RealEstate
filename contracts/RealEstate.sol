//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract RealEstate{
    address public owner;
    uint public objectId;
    

    struct Object {
        address owner;
        uint totalArea;
        uint livingArea;
    }

    enum Roles {NONE, ADMIN, USER}

    struct Person {
        uint[] objectIds;     
        Roles role;
        uint balance;
        uint totalObjects;
        uint activeSeller;
        uint activeBuyer;

    }
    uint[] public allActiveDeals;
    mapping(address => Person) public users;
    mapping (address=>bool) isGetBalance;
    
    mapping(uint => Object) property;

    struct Deal {
        uint id;
        uint price;
        uint timeStart;
        uint timeEnd;
        address buyer;
        bool activeDeal;
    }

    mapping(uint => Deal) deals;

//    array objects;
    event NewUser(address _address, Roles _role, uint balance);
    event NewDeal(address _seller, uint _id, uint _price, uint _timeStart);

    


    constructor(address[3] memory _admins, address[3] memory _users) {
        owner = msg.sender;
         users[owner].role = Roles.ADMIN;
//        createAdmin(owner);
        for (uint i=0; i < _admins.length; i++) {
            createAdmin(_admins[i]);
        }

        for (uint i=0; i <  _users.length; i++) {
            createUser( _users[i]);
        }
        
         
        createObject(_users[0], 40, 33);
        createObject(_users[1], 100, 79);

        for (uint i=0; i < _users.length; i++) {
            users[_users[i]].balance = 130;
        }
        
    }

    modifier onlyAdmin() {
        require(users[msg.sender].role == Roles.ADMIN, "You have no permission");
        _;
    }
    modifier isActive(uint _id) {
        require(deals[_id].activeDeal == true && deals[_id].timeEnd >= block.timestamp, "The deal is not active");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not owner");
        _;
    }


    function createAdmin(address _address) public onlyOwner {
        if(users[_address].role != Roles.USER) {
            _setBalance(_address);
            users[_address].role = Roles.ADMIN;
        } else {
            users[_address].role = Roles.ADMIN;
            }

         emit NewUser(_address, Roles.ADMIN, users[_address].balance);   
        }
        

    function createUser(address _address) public {
        if(users[_address].role == Roles.ADMIN) {
            require(msg.sender == owner, "You can't delete admin");
        }else {
         _setBalance(_address); 
         }
        users[_address].role = Roles.USER;
        emit NewUser(_address, Roles.USER, users[_address].balance);
        }
        
    function registration() public {
        require(users[msg.sender].role == Roles.NONE, "You already registred");
        createUser(msg.sender);
    }

    function _setBalance(address _address) private {
        require(!isGetBalance[_address], "User Alredy exist");
        users[_address].balance = 130;
        isGetBalance[_address] = true;
    }

    function createObject(address _address, uint _totalArea, uint _livingArea) public onlyAdmin {
        require(_totalArea >= _livingArea, "The total Area should be more than living Area" );
        objectId++;
        property[objectId].owner = _address;
        property[objectId].totalArea = _totalArea;
        property[objectId].livingArea = _livingArea;        
        users[_address].objectIds.push(objectId);
        users[_address].totalObjects++;
    }

    function createSale(uint _id, uint _price, uint _duration) external {
        require(deals[_id].activeDeal == false, "The deal with that item is already exist");
        require(property[_id].owner == msg.sender, "You are not the owner of this item");

        deals[_id] = Deal( _id, _price, block.timestamp, block.timestamp + _duration, address(0), true);
        allActiveDeals.push(_id);
        users[msg.sender].activeSeller++;
        emit NewDeal(msg.sender, _id, _price, block.timestamp);        

    }

    function proposal(uint _id) external isActive(_id) {
 //       require(deals[_id].activeDeal == true && deals[_id].timeEnd >= block.timestamp, "The deal is not active");
        require(property[_id].owner != msg.sender, "You can't buy from yourself");
        require(deals[_id].buyer == address(0), "The buyer is already exist");
        require(users[msg.sender].balance >=deals[_id].price);
        deals[_id].buyer = msg.sender;
        users[msg.sender].activeBuyer++;
        users[msg.sender].balance -= deals[_id].price;

    }

    function confirmSale(uint _id) external {
        require(property[_id].owner == msg.sender, "You are not the owner of this item");
        require(deals[_id].buyer != address(0),  "There is no buyer");
        require(deals[_id].activeDeal == true && deals[_id].timeEnd >= block.timestamp, "The deal is not active");

        users[msg.sender].balance += deals[_id].price;
        for (uint i=0; i <users[msg.sender].totalObjects; i++) {
            if(users[msg.sender].objectIds[i] == _id ){
                users[msg.sender].objectIds[i] = users[msg.sender].objectIds[users[msg.sender].totalObjects-1];
                users[msg.sender].objectIds.pop(); 
                }               
            }
        users[msg.sender].activeSeller--;
        users[deals[_id].buyer].activeBuyer--;

        deleteFromActiveDeals(_id);


        users[msg.sender].totalObjects--;
        users[deals[_id].buyer].totalObjects++;
        users[deals[_id].buyer].objectIds.push(_id);
        property[_id].owner = deals[_id].buyer;
        
        delete deals[_id];

    }

    function deleteFromActiveDeals(uint _id) private {
        for (uint i=0; i < allActiveDeals.length; i++) {
            if(allActiveDeals[i] == _id) {
                    allActiveDeals[i] = allActiveDeals[allActiveDeals.length - 1];
                    allActiveDeals.pop();
                } 
        }
    }

    function cashBack(uint _id) external {
        require(deals[_id].activeDeal == true, "The deal is not active");
        require(deals[_id].buyer == msg.sender,  "You are not the buyer");
        require(deals[_id].timeEnd <= block.timestamp, "The deal is still active");
        users[msg.sender].activeBuyer--;
        

        deleteFromActiveDeals(_id);
        users[msg.sender].balance += deals[_id].price;
        deals[_id].buyer = address(0);
    }

    function cancelDeal (uint _id) external isActive(_id){
        require(property[_id].owner == msg.sender, "You are not the owner of this item");
//       require(deals[_id].activeDeal == true, "The deal is not active");
        if(deals[_id].buyer != address(0)) {
        
        users[deals[_id].buyer].balance += deals[_id].price;
        users[deals[_id].buyer].activeBuyer--;
        }
        users[msg.sender].activeSeller--;

        deleteFromActiveDeals(_id);
        delete deals[_id];
    }

    function showObject (uint _id) public view returns(address, uint, uint){
        return(property[_id].owner, property[_id].totalArea, property[_id].livingArea);
    }

    
    function showUserObjects(address _address) view public returns(uint[] memory) {
        return users[_address].objectIds;
    }

    function showPerson(address _address) view external returns(uint[] memory, Roles, uint, uint) {
        return (users[_address].objectIds, users[_address].role, users[_address].balance, users[_address].totalObjects);
    }

    function showDeal(uint _id) external view returns(address, uint, uint , uint, address) {
        require(deals[_id].timeStart > 0, "The Deal is not exist");
        return(property[_id].owner, deals[_id].price,
        deals[_id].timeStart, deals[_id].timeEnd, deals[_id].buyer);
    }

    function checkDealActive(uint _id) public view returns(bool) {
        return  deals[_id].activeDeal;
    }

    function getAllActiveDeals() external view returns(uint[] memory){
        return allActiveDeals;
    }

    function showAllMyObject() external view returns(Object[] memory){
        uint lenght = users[msg.sender].objectIds.length;
        Object[] memory temp = new Object[](lenght);
        for (uint i=0; i < lenght; i++) {
            temp[i] = (property[users[msg.sender].objectIds[i]]); 
        }
        return temp;
        
    }

    function showAllActiveSale() external view returns(Deal[] memory) {
        uint length = users[msg.sender].activeSeller;
        uint _iTemp;
        Deal[] memory tempDeal = new Deal[](length);
        for (uint i=0; i < users[msg.sender].objectIds.length; i++) {
            console.log("test ", i,users[msg.sender].objectIds[i], deals[users[msg.sender].objectIds[i]].activeDeal );
            if(checkDealActive(users[msg.sender].objectIds[i])) {
                tempDeal[_iTemp] = deals[users[msg.sender].objectIds[i]]; 
                _iTemp++;
            }        
        }
        return tempDeal;
    }

    function showAllActiveBuyer() external view returns(Deal[] memory) {
        uint length = users[msg.sender].activeBuyer;
        uint _iTemp;
        console.log("length ", length);
        Deal[] memory tempBuy = new Deal[](length);
        for (uint i=0; i < allActiveDeals.length; i++) {
            console.log(deals[allActiveDeals[i]].buyer == msg.sender);
//            console.log("test ", i,users[msg.sender].objectIds[i], deals[users[msg.sender].objectIds[i]].activeDeal );
            if(deals[allActiveDeals[i]].buyer == msg.sender) {
                tempBuy[_iTemp] = deals[allActiveDeals[i]]; 
                _iTemp++;
                }        
        }
        console.log("finish", tempBuy.length);
        return tempBuy;
    }
}