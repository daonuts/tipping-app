pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";

contract Tipping is AragonApp {
    enum ContentType                                       { NONE, COMMENT, POST }

    MiniMeToken public currency;

    /// ACL
    bytes32 constant public NONE = keccak256("NONE");

    event Tip(address from, address to, uint amount, ContentType ctype, uint40 cid);

    function initialize(address _currency) onlyInit public {
        initialized();

        currency = MiniMeToken(_currency);
    }

    function tip(address _to, uint _amount, ContentType _ctype, uint40 _cid) external {
        require( currency.transferFrom(msg.sender, _to, _amount), "ERROR_TOKEN" );
        emit Tip(msg.sender, _to, _amount, _ctype, _cid);
    }

}
