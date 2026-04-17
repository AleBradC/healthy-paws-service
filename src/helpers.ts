import * as bcrypt from "bcrypt";

export const hashPassword = async (password: string, saltRounds = 10): Promise<string> => {
  return await bcrypt.hash(password, saltRounds);
};
