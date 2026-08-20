// Zapytania, mutacje i typy GraphQL obsługujące dane biur nieruchomości

import { gql } from "@apollo/client";

export const GET_COMPANIES = gql`
  query GetCompanies($limit: Int, $offset: Int) {
    getCompanies(limit: $limit, offset: $offset) {
      items {
        id
        shortId
        name
        domain
        logoUrl
        coverImageUrl
        isActive
        type
        settings {
          nip
          website
          phone
          email
          address { street city postalCode country }
          licenseNumber
          timezone
          language
        }
        userCount
        createdAt
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_COMPANY_BY_ID = gql`
  query GetCompanyById($id: ID!) {
    getCompanyById(id: $id) {
      id
      shortId
      name
      domain
      logoUrl
      coverImageUrl
      isActive
      type
      settings {
        nip
        website
        phone
        email
        address { street city postalCode country }
        licenseNumber
        timezone
        language
      }
      userCount
      createdAt
    }
  }
`;

export const CREATE_COMPANY = gql`
  mutation CreateCompany(
    $name: String!
    $domain: String
    $type: CompanyType
    $settings: CompanySettingsInput
    $adminEmail: String!
    $adminName: String!
    $adminPassword: String!
  ) {
    createCompany(
      name: $name
      domain: $domain
      type: $type
      settings: $settings
      adminEmail: $adminEmail
      adminName: $adminName
      adminPassword: $adminPassword
    ) {
      id
      shortId
      name
      domain
      isActive
      type
      createdAt
    }
  }
`;

export const UPDATE_COMPANY = gql`
  mutation UpdateCompany(
    $id: ID!
    $name: String
    $domain: String
    $logoUrl: String
    $coverImageUrl: String
    $isActive: Boolean
    $settings: CompanySettingsInput
  ) {
    updateCompany(id: $id, name: $name, domain: $domain, logoUrl: $logoUrl, coverImageUrl: $coverImageUrl, isActive: $isActive, settings: $settings) {
      id
      shortId
      name
      domain
      logoUrl
      coverImageUrl
      isActive
      type
      settings {
        nip
        website
        phone
        email
        address { street city postalCode country }
        licenseNumber
        timezone
        language
      }
      userCount
      createdAt
    }
  }
`;
