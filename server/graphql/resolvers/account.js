const db = require('../../database');
const authUtils = require('../../utils/authUtils');

const updateAccount = async (root, args, { token, user }) => {
	authUtils.authenticate(token);

	const { accountId } = user;
	const userRecord = await db.accounts.findByPk(accountId);

	const { firstName, lastName, email, country, region } = args;
	userRecord.update({
		firstName,
		lastName,
		email,
		country,
		region
	});

	return {
		success: true
	};
};

const updatePassword = async (root, args, { token, user }) => {
	authUtils.authenticate(token);

	const { accountId } = user;
	const userRecord = await db.accounts.findByPk(accountId);

	const { currentPassword, newPassword } = args;
	const isCorrect = await authUtils.isValidPassword(currentPassword, userRecord.dataValues.password);

	if (!isCorrect) {
		return {
			success: false,
			error: 'PASSWORD_INCORRECT'
		};
	}

	const newPasswordHash = await authUtils.getPasswordHash(newPassword);

	userRecord.update({
		password: newPasswordHash
	});

	return {
		success: true
	};
};

const createAccount = async (root, args, { token, user }) => {
	// TODO verify is admin
	authUtils.authenticate(token);

	const { accountId } = user;
	const dateCreated = new Date().getTime();
	const { firstName, lastName, password, email, country, region } = args;

	const account = await db.accounts.create({
		createdBy: accountId,
		accountType: 'admin',
		dateCreated,
		lastUpdated: dateCreated,
		password: '',
		firstName,
		lastName,
		email,
		country,
		region,
		numRowsGenerated: 0
	});

	console.log("2222222");

	console.log(".......", account);

	return {
		success: true
	};
};


module.exports = {
	updateAccount,
	updatePassword,
	createAccount
};
