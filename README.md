# Adent

[Drizzle](https://github.com/drizzle-team/drizzle-orm) is a flexible 
thin layer around SQL databases. [Exma](https://github.com/OSSPhilippines/exma)
allows custom generators parsed data of loosely defined schema files.
[Next](https://nextjs.org/) is a popular react meta framework that 
naturally works with serverless. [Tailwind](https://tailwindcss.com/) is
a style engine using utility classes similar to bootstrap.

**Adent** is a content management framework; a stack using these four 
libraries to automatically create database models, server/graphql 
endpoints, pre-formed react components & pages, and auto tested content 
administration.

## Install

```bash
$ npm i adent
```

## 1. Usage

In your root project, craete a file called `schema.exma` and paste the 
following.

```js
plugin "adent" {
  lang "ts"
  engine "postgres"
  url "env(DATABASE_URL)"
  seed "env(SESSION_SEED)"
  modules "modules"
  router "pages"
  path "admin"
}

model Profile @label("User" "Users") {
  id          String   @label("ID") 
                       @id @default("cuid()")
  
  name        String   @label("Name") 
                       @searchable
                       @field.text
                       @is.required
                       @list.text @view.text

  image       String?  @label("Image") 
                       @field.url
                       @list.image(20 20) @view.image(100 100)
  
  description String?  @label("Description") 
                       @field.textarea
                       @list.none @view.text
  
  type        String   @label("Type") 
                       @default("person") 
                       @filterable
                       @field.text
                       @is.required
                       @list.lowercase @view.lowercase
  
  roles       String[] @label("Roles") 
                       @field.textlist
                       @view.tags
  
  tags        String[] @label("Tags") 
                       @field.tags
                       @view.tags
  
  references  Hash?    @label("References") 
                       @field.metadata
                       @view.metadata
  
  active      Boolean  @label("Active") 
                       @default(true) @filterable
                       @list.yesno @view.yesno
  
  created     DateTime @label("Created") 
                       @default("now()") @sortable
                       @list.date("m d, Y h:iA") 
                       @view.date("m d, Y h:iA")
  
  updated     DateTime @label("Updated") 
                       @default("now()") @timestamp @sortable
                       @list.date("m d, Y h:iA") 
                       @view.date("m d, Y h:iA")
  
  auth        Auth?        
  connections Connection[] 
  memberships Connection[] 
  files       File[]       
  addresses   Address[]    
}
```

Next run the following in your project root and wait for the output.

```bash
$ npx exma
```

This should create a `modules` folder in your project root.
