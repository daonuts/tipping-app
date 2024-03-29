/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";

import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@daonuts/token/contracts/Token.sol";

import "./Tipping.sol";


contract TemplateBase is APMNamehash {
    ENS public ens;
    DAOFactory public fac;

    event DeployDao(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) public {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = TemplateBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}


contract Template is TemplateBase {
    /* MiniMeTokenFactory tokenFactory; */

    uint constant TOKEN_UNIT = 10 ** 18;
    uint64 constant PCT = 10 ** 16;
    address constant ANY_ENTITY = address(-1);

    constructor(ENS ens) TemplateBase(DAOFactory(0), ens) public {
        /* tokenFactory = new MiniMeTokenFactory(); */
    }

    function newInstance() public {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        address root = msg.sender;
        bytes32 tippingAppId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("tipping-app")));
        bytes32 tokenManagerAppId = apmNamehash("token-manager");

        Tipping tipping = Tipping(dao.newAppInstance(tippingAppId, latestVersionAppBase(tippingAppId)));
        TokenManager tokenManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));

        /* MiniMeToken token = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Currency", 18, "CURRENCY", true); */
        Token token = new Token("Currency", 18, "CURRENCY", true);
        token.changeController(tokenManager);

        // Initialize apps
        tokenManager.initialize(MiniMeToken(token), true, 0);
        emit InstalledApp(tokenManager, tokenManagerAppId);
        tipping.initialize(token);
        emit InstalledApp(tipping, tippingAppId);

        /* acl.createPermission(root, tipping, tipping.NULL_ROLE(), root); */
        acl.createPermission(0x0, tipping, 0x0, 0x0);
        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);

        tokenManager.mint(root, 1000*TOKEN_UNIT); // Give 1000 token to msg.sender

        // Clean up permissions
        acl.grantPermission(root, dao, dao.APP_MANAGER_ROLE());
        acl.revokePermission(this, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(root, dao, dao.APP_MANAGER_ROLE());

        acl.grantPermission(root, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.revokePermission(this, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(root, acl, acl.CREATE_PERMISSIONS_ROLE());

        emit DeployDao(dao);
    }

}
