import { hashPassword, verifyPassword } from './password.js';

const testPassword = async (): Promise<void> => {
  const password = 'myPassword123';
  const passwordHash = await hashPassword(password);

  console.log('generated password hash:', passwordHash);

  const validPassword = await verifyPassword(password, passwordHash);
  const invalidPassword = await verifyPassword('wrongPassword', passwordHash);

  console.log('valid password:', validPassword);
  console.log('invalid password:', invalidPassword);
};

void testPassword();