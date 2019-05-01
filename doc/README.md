# Webgallery REST API Documentation

## User API

```
- description: Sign up
- request: `POST /signup/`
    - content-type: `application/json`
    - body: object
      - username: username
      - password: password
- response: 200
    - content-type: `application/json`
    - body: username

$ curl -H "Content-Type: application/json" 
       -X POST -d '{"username":"alice","password":"alice"}' 
       -c cookie.txt localhost:3000/signup/
```
```
- description: Sign in
- request: `POST /signin/`
    - content-type: `application/json`
    - body: object
      - username: username
      - password: password
- response: 200
    - content-type: `application/json`
    - body: username

$ curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signin/
```
```
- description: Sign out
- request: `POST /signout/`
- response: 200

$ curl -b cookie.txt -c cookie.txt localhost:3000/signout/
```
```
- description: get all users in db
- request: `GET /api/users/`
- response: 200
    - content-type: `application/json`
    - body: list of objects

$ curl localhost:3000/api/users/
```

## Image API

### Create

```
- description: update the order total based on given order number
- request: `PATCH /api/api/order/total/`
    - content-type: `application/json`
    - body: object
      - total: total of the order
      - orderNumber: order number
- response: 200
    - content-type: `application/json`
    - body: empty

curl -X PATCH -H "Content-Type: application/json" -b cookie.txt -d '{"total": 100, "orderNumber": 1 }' http://localhost:3000/api/order/total/
```

```
- description: update payment status of an order
- request: `PATCH /api/order/payed/`
    - content-type: `application/json`
    - body: object
      - payed: boolean indicating whether the order has been payed
      - orderNumber: order number
- response: 200
    - content-type: `application/json`
    - body: empty

curl -X PATCH -H "Content-Type: application/json" -b cookie.txt -d '{"payed": 0, "orderNumber": 1 }' http://localhost:3000/api/order/payed/
```

```
- description: update "complete" status of an order
- request: `PATCH /api/order/status/complete/`
    - content-type: `application/json`
    - body: object
      - completed: boolean indicating whether the order has been complete
      - orderNumber: order number
- response: 200
    - content-type: `application/json`
    - body: empty

curl -X PATCH -H "Content-Type: application/json" -b cookie.txt -d '{"completed": 0, "orderNumber": 1 }' http://localhost:3000//api/order/status/complete/
```

### Read

```
- description: Get image file
- request: `GET /api/images/display/id/`
- response: 200
    - content-type: `MIME`
    - body: file

$ curl -b cookie.txt http://localhsot:3000/api/images/display/0/
```
```
- description: Get the first gallery image given a username
- request: `GET /api/gallery/username/`
- response: 200
    - content-type: `application/json`
    - body: object
      - _id: (string) the image id
      - author: (string) the authors name
      - Date: upload date
      - title: image title
      - next: next image
      - prev: prev image
      - owner: username of the user who posted the image

$ curl -b cookie.txt http://localhsot:3000/api/gallery/bob/
```
```
- description: Get the current displaying image
- request: `GET /api/displaying/`
- response: 200
    - content-type: `application/json`
    - body: object
      - _id: (string) the image id
      - author: (string) the authors name
      - Date: upload date
      - title: image title
      - next: next image
      - prev: prev image
      - owner: username of the user who posted the image

$ curl -b cookie.txt http://localhsot:3000/api/displaying/
```
```
- description: Get an image given image id
- request: `GET /api/images/id/`
- response: 200
    - content-type: `application/json`
    - body: object
      - _id: (string) the image id
      - author: (string) the authors name
      - Date: upload date
      - title: image title
      - next: next image
      - prev: prev image
      - owner: username of the user who posted the image

$ curl -b cookie.txt http://localhsot:3000/api/images/0/
```

### Delete

```
- description: delete an image given its id
- request: `DELETE /api/images/id/`
- response: 200
    - content-type: `application/json`
    - body: object
      - _id: (string) the image id
      - author: (string) the authors name
      - Date: upload date
      - title: image title
      - next: next image
      - prev: prev image
      - owner: username of the user who posted the image

$ curl -b cookie.txt -X DELETE localhost:3000/api/messages/0/
```

## Comment API

### Create

```
- description: Post a new comment
- request: `POST /api/comments/`
    - content-type: `application/json`
    - body: object
      - imageId: image ID
      - content: message content
- response: 200
    - content-type: `application/json`
    - body: object
       - _id: comment id
      - imageId: image ID
      - author: username of the user who posted the comment
      - content: message content
      - date: publish date

$ curl -b cookie.txt -H "Content-Type: application/json" 
       -X POST -d '{"content":"hello world!", "imageId": 0}' localhost:3000/api/messages/
```

### Read
```
- description: retrieve the last 10 comments for a given image
- request: `GET /api/messages/imageId/page`   
- response: 200
    - content-type: `application/json`
    - body: list of objects
      - _id: (string) the message id
      - content: (string) the content of the message
      - author: (string) username of the user who posted the comment
      - imageId: image ID
      - date: publish date
 

$ curl -b cookie.txt -X GET http://localhsot:3000/api/comments/0
```

### Delete

```
- description: Delete a comment given its id and its associated image gallery
- request: `DELETE /api/comments/id/gallery/`
- response: 200
    - content-type: `application/json`
    - body: object
       - _id: comment id
      - imageId: image ID
      - author: username of the user who posted the comment
      - content: message content
      - date: publish date

$ curl -b cookie.txt -X DELETE localhost:3000/api/comments/0/bob/
```