const request = require("request");
const server = require("../../src/server");
const base = "http://localhost:3000/topics";

const sequelize = require("../../src/db/models/index").sequelize;
const Topic = require("../../src/db/models").Topic;
const Post = require("../../src/db/models").Post;
const User = require("../../src/db/models").User;
const Vote = require("../../src/db/models").Vote;
const Favorite = require("../../src/db/models").Favorite;

describe("routes : posts", () => {

    beforeEach((done) => {
        this.topic;
        this.post;
        this.user;

        sequelize.sync({force: true}).then((res) => {

            User.create({
                email: "starman@tesla.com",
                password: "Trekkie4lyfe"
            })
            .then((user) => {
                this.user = user;

                Topic.create({
                    title: "Winter Games",
                    description: "Post your Winter Games stories.",
                    posts: [{
                        title: "Snowball Fighting",
                        body: "So much snow!",
                        userId: this.user.id
                    }] 
                }, {
                    include: {
                        model: Post,
                        as: "posts"
                    }
                })
                .then((topic) => {
                    this.topic = topic;
                    this.post = topic.posts[0];
                    done();
                })
            })
        });
    });

    describe("GET /topics/:topicId/posts/new", () => {

        it("should render a new post form", (done) => {
            request.get(`${base}/${this.topic.id}/posts/new`, (error, res, body) => {
                expect(error).toBeNull();
                expect(body).toContain("New Post");
                done();
            });
        });
    });

    describe("POST /topics/:topicId/posts/create", () => {

        it("should create a new post and redirect", (done) => {
            const options = {
                url: `${base}/${this.topic.id}/posts/create`,
                form: {
                    title: "Watching snow melt",
                    body: "Without a doubt my favorite thing to do besides watching paint dry!",
                    userId: this.user.id
                }
            };
            request.post(options,
                (error, res, body) => {
                    Post.findOne({where: {title: "Watching snow melt"}})
                    .then((post) => {
                        expect(post).not.toBeNull();
                        expect(post.title).toBe("Watching snow melt");
                        expect(post.body).toBe("Without a doubt my favorite thing to do besides watching paint dry!");
                        expect(post.topicId).not.toBeNull();
                        done();
                    })
                    .catch((error) => {
                        console.log(error);
                        done();
                    });
                });
        });

        it("should not create a new post that fails validations", (done) => {
            const options = {
                url: `${base}/${this.topic.id}/posts/create`,
                form: {
                    title: "a",
                    body: "b"
                }
            };

            request.post(options, 
                (err, res, body) => {

                    Post.findOne({where: {title: "a"}})
                    .then((post) => {
                        expect(post).toBeNull();
                        done();
                    })
                    .catch((err) => {
                        console.log(err);
                        done();
                    });
                });
        });

        it("should create a favorite for the post on creation", (done) => {
            const options = {
                url: `${base}/${this.topic.id}/posts/create`,
                form: {
                    title: "Sidewalk Snow Cones",
                    body: "1. Fill a cup with clean snow. 2. Add your favorite soda. 3. Enjoy!",
                    userId: this.user.id
                }
            };

            request.post(options, 
                (err, res, body) => {
                    Post.findOne({where: {title: "Sidewalk Snow Cones"}})
                    .then((newPost) => {
                        this.newPost = newPost;

                        expect(newPost.id).toBe(this.newPost.id);

                        Favorite.findOne({where: {postId: this.newPost.id}}).then((favorite) => {
                            expect(favorite).not.toBeNull();
                            expect(favorite.userId).toBe(this.user.id);
                            done();
                        })
                        .catch((err) => {
                            console.log(err);
                            done();
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                        done();
                    });
                });
        });

        it("should create an upvote on post creation", (done) => {
            const options = {
                url: `${base}/${this.topic.id}/posts/create`,
                form: {
                    title: "Going Sledding",
                    body: "If you don't have a sled, use a trash bag!",
                    userId: this.user.id
                }
            };

            request.post(options, 
                (err, res, body) => {
                    Post.findOne({where: {title: "Going Sledding"}}).then((newPost) => {
                        this.newPost = newPost;

                        Vote.findOne({where: {postId: this.newPost.id}}).then((vote) => {
                            expect(vote.value).toBe(1);
                            expect(vote.userId).toBe(this.user.id);
                            done();
                        })
                        .catch((err) => {
                            console.log(err);
                            done();
                        })
                    })
                    .catch((err) => {
                        console.log(err);
                        done();
                    });
                });
        });
    });

    describe("GET /topics/:topicId/posts/:id", () => {

        it("should render a view with the selected post", (done) => {
            request.get(`${base}/${this.topic.id}/posts/${this.post.id}`, (error, res, body) => {
                expect(error).toBeNull();
                expect(body).toContain("Snowball Fighting");
                done();
            });
        });
    });

    describe("POST /topics/:topicId/posts/:id/destroy", () => {

        it("should delete the post with the associated ID", (done) => {

            request.post(`${base}/${this.topic.id}/posts/${this.post.id}/destroy`, (error, res, body) => {

                Post.findById(1)
                .then((post) => {
                    expect(error).toBeNull();
                    expect(post).toBeNull();
                    done();
                })
            });
        });
    });

    describe("GET /topics/:topicId/posts/:id/edit", () => {

        it("should render a view with an edit post form", (done) => {
            request.get(`${base}/${this.topic.id}/posts/${this.post.id}/edit`, (err, res, body) => {
                expect(err).toBeNull();
                expect(body).toContain("Edit Post");
                expect(body).toContain("Snowball Fighting");
                done();
            });
        });
    });

    describe("POST /topics/:topicId/posts/:id/update", () => {

        it("should return a status code of 302", (done) => {
            request.post({
                url: `${base}/${this.topic.id}/posts/${this.post.id}/update`,
                form: {
                    title: "Snowman Building Competition",
                    body: "I love watching them melt slowly."
                }
            }, (err, res, body) => {
                expect(res.statusCode).toBe(302);
                done();
            });
        });

        it("should update the post with the given values", (done) => {
            const options = {
                url: `${base}/${this.topic.id}/posts/${this.post.id}/update`,
                form: {
                    title: "Snowman Building Competition",
                    body: "I love watching them melt slowly."
                }
            };
            request.post(options, 
                (err, res, body) => {

                    expect(err).toBeNull();

                    Post.findOne({where: {id: this.post.id}})
                    .then((post) => {
                        expect(post.title).toBe("Snowman Building Competition");
                        expect(post.body).toBe("I love watching them melt slowly.")
                        done();
                    });
                });
        });
    });

});