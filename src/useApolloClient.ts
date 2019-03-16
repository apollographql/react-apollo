import { ApolloContext } from './ApolloContext'

export function useApolloClient() {
  return React.useContext(ApolloContext)
}
