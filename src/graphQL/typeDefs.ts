const typeDefs: string = `
      scalar Date
      scalar Upload

      type User {
        id:ID!
        name: String!
        username: String!
        email: String!
        profilePicture: String!
        createdAt: Date!
        updatedAt: Date!
      }

      type Chat {
        id: ID!
        chatName: String
        isGroupChat: Boolean!
        participants: [User!]!
        groupAdmin: User
        lastMessageAt: Date!
        createdAt: Date!
        updatedAt: Date!
      }

      type Message {
        id: ID!
        chat: Chat!
        sender: User!
        content: String!
        createdAt: Date!
        updatedAt: Date!
      }

      type Query {
        hello: String!

        me: User!
      }

      type Mutation {
        updateUser(
          name: String
          username: String
          profilePicture: Upload
          email: String
        ):User!

        createOneToOneChat(
          userId: ID!
        ): Chat!

        createGroupChat(
          chatName: String!
          participants: [ID!]!
        ): Chat!

        sendMessageInChat(
          chatId: String!
          message: String
          file: Upload
        ): Message!
      }
`;

export default typeDefs;
