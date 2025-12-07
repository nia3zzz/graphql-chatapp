const resolvers = {
  Query: {
    hello: (): string => {
      return "Hello world!";
    },
  },
};

export default resolvers;
