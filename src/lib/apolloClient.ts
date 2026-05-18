import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  // In dev, Vite proxies /graphql → http://localhost:4000/graphql (no CORS needed).
  // In production, point VITE_GRAPHQL_URL at your hosted backend.
  uri: import.meta.env.VITE_GRAPHQL_URL ?? '/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = sessionStorage.getItem('sl_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
});
