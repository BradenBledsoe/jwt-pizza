# Curiosity Report: HAR Files
## Why I Chose This Topic:
In our class, for our load testing deliverable, we uploaded a HAR file to Grafana to help us get a good jumpstart on our K6 tests. I was extremely curious as to what this file actually was because we just brushed over it, and it seemed to do a lot for us. I knew this tracked our requests done on the browser, but I wanted to know more, including what these files could be used for and what they all contain.
## What is a HAR File
A HAR file is a JSON-formatted log of all network requests and responses between a web browser and a website. This file is primarily used by developers for troubleshooting website performance and debugging possible issues like slow load times, network problems, or failed requests. It does this by providing information about the page's resources, timing, headers, and cookies. 
## What a HAR file contains
- **Requests and Responses:** Full details of every HTTP request and response, including headers, status codes, and cookies during a recording. 
- **Timing:** Detailed timing information for each resource, showing how long it took to load.
- **Payload data:** The content or body of the requests and responses.
- **Other metrics:** Information like the size of resources and other performance-related data.
## Example
In my example, I was really curious to know what a HAR file would look like that wasn't based off of our pizza jwt website. So, instead I used a website I am building and modifying in my cs340 class instead. This website is known as Tweeter and is very simplified version of what used to be known as Twitter, now X. It is a social media website to show things like followers and followees and different posts that users put out. For this example, I logged a user logging in, making and posting something, and then logging out. Here is the UI to understand what I was messing with:
![Login Page](../Login_Page_Tweeter.png)
![Posting Status](../Posting_Status.png)
From logging in correctly, then posting something as simple as "Hello World", 
