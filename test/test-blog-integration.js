'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
	console.info('seeding blog data');
	const seedData = [];

	for(let i = 0; i<10; i++) {
		seedData.push(generateBlogData());
	}

	return BlogPost.insertMany(seedData);
}


// title, content, author
function generateTitle() {
	return faker.random.words();
}
function generateContent() {
	return faker.lorem.paragraph();
}
function generateAuthor() {
	const name = {
		firstName: faker.name.firstName(),
		lastName: faker.name.lastName()
	};
	return name;
}

function generateBlogData() {
	return {
		title: generateTitle(),
		content: generateContent(),
		author: generateAuthor()
	};
}

function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {
	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedBlogData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	});

	describe('GET endpoint', function() {
		it('should return all existing posts', function() {
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res) {
					res = _res;
					expect(res).to.have.status(200);
					expect(res.body).to.have.length.of.at.least(1);
					return BlogPost.count();
				})
				.then(function(count) {
					expect(res.body).to.have.lengthOf(count);
				});

		});

		it('should return posts with the right fields', function() {
			let resPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.be.a('array');
					expect(res.body).to.have.length.of.at.least(1);

					res.body.forEach(function(post) {
						expect(post).to.be.a('object');
						expect(post).to.include.keys('id', 'title', 'author', 'content');
					});
					resPost = res.body[0];
					return BlogPost.findById(resPost.id);
				})
				.then(function(post) {
					expect(resPost.id).to.equal(post.id);
					expect(resPost.title).to.equal(post.title);
					expect(resPost.content).to.equal(post.content);
					expect(resPost.author).to.contain(post.author.lastName);
				});
		});

		describe('POST endpoint', function() {
			it('should add a new post', function() {
				const newPost = generateBlogData();

				return chai.request(app)
					.post('/posts')
					.send(newPost)
					.then(function(res) {
						expect(res).to.have.status(201);
						expect(res).to.be.json;
						expect(res.body).to.be.a('object');
						expect(res.body).to.include.keys('id', 'title','content', 'author');
						expect(res.body.id).to.not.be.null;
						expect(res.body.title).to.equal(newPost.title);
						expect(res.body.content).to.equal(newPost.content);
						return BlogPost.findById(res.body.id);
					})
					.then(function(post) {
						expect(post.title).to.equal(newPost.title);
						expect(post.content).to.equal(newPost.content);
						expect(post.author.firstName).to.equal(newPost.author.firstName);
						expect(post.author.lastName).to.equal(newPost.author.lastName);
					});
			});
		});

		describe('PUT endpoint', function() {
			it('should update requested fields', function() {
				const updateFields = {
					title: 'LOOK AT THIS TITLE!!!!!!',
					content: 'Noble gases are stable'
				};

				return BlogPost
				.findOne()
				.then(function(post) {
					updateFields.id = post.id;
					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateFields);
				})
				.then(function(res) {
					expect(res).to.have.status(204);
					return BlogPost.findById(updateFields.id);
				})
				.then(function(post) {
					expect(post.title).to.equal(updateFields.title);
					expect(post.content).to.equal(updateFields.content);
				});
			});
		});

		describe('DELETE endpoint', function() {
			it('delete a post by id', function() {
				let post;
				return BlogPost
					.findOne()
					.then(function(_post) {
						post = _post;
						return chai.request(app).delete(`/posts/${post.id}`)
					})
					.then(function(res) {
						expect(res).to.have.status(204);
						return BlogPost.findById(post.id);
					})
					.then(function(_post) {
						expect(_post).to.be.null;
					});
			});
		});

	});
});
















