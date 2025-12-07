const typeDefs: string = `
      scalar Date

      type User {
        id:ID!
        name:String!
        username:String!
        email:String!
        profilePicture:String!
        createdAt:Date!
        updatedAt:Date!
      }

      type Chat {
        id:ID!
        chatName:String!
        isGroupChat:Boolean!
        participants:[User!]!
        groupAdmin:User!
        createdAt:Date!
        updatedAt:Date!
      }

      type Message {
        id:ID!
        sender:User!
        reciever:User!
        content:String!
        createdAt:Date!
        updatedAt:Date!
      }

      type Query {
        hello: String!
      }
    `;

export default typeDefs;
