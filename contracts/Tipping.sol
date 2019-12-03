pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@daonuts/token/contracts/Token.sol";

contract Tipping is AragonApp {
    Token public currency;

    // Errors
    string private constant ERROR_TOKEN_TRANSFER = "TOKEN_TRANSFER_FAILED";
    string private constant ERROR_INVALID_TOKEN = "INVALID_TOKEN";

    event Tip(address from, address to, uint amount, bytes32 contentId);

    function initialize(address _currency) onlyInit public {
        initialized();

        currency = Token(_currency);
    }

    function tokensReceived(
        address _operator, address _from, address _to, uint _amount, bytes _data, bytes _operatorData
    ) external {
        require( msg.sender == address(currency), ERROR_INVALID_TOKEN );

        uint8 action = uint8(_data[0]);
        if( action == 1 ) {           // tip
            address tipTo;
            bytes32 contentId;
            (tipTo, contentId) = extractTipParameters(_data);
            require( currency.transfer(tipTo, _amount), ERROR_TOKEN_TRANSFER );
            emit Tip(_from, tipTo, _amount, contentId);
        } else {
          revert("UNKNOWN_ACTION");
        }
    }

    function tip(address _to, uint _amount, bytes32 _contentId) external {
        require( currency.transferFrom(msg.sender, _to, _amount), ERROR_TOKEN_TRANSFER );
        emit Tip(msg.sender, _to, _amount, _contentId);
    }

    function extractTipParameters(bytes _data) public view returns (address to, bytes32 contentId) {
        bytes memory data = _data;

        // first byte of data should have action as uint8
        assembly {
          to := mload(add(data, 33))
          contentId := mload(add(data, 65))
        }
    }

}
