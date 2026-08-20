"use client";

// Udostępnia klienta Apollo całemu drzewu widoków klienckich

import { client } from "@/lib/graphql/apollo-client";
import { ApolloProvider as BaseApolloProvider } from "@apollo/client/react";
import React from "react";

export const ApolloProvider = ({ children }: { children: React.ReactNode }) => {
  return <BaseApolloProvider client={client}>{children}</BaseApolloProvider>;
};
