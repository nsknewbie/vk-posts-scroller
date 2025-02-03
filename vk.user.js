// ==UserScript==
// @name        VK Posts scroller
// @version     1.1
// @namespace   https://github.com/nsknewbie/vk-posts-scroller
// @author      Evgeniy Tsvetkov (https://github.com/nsknewbie)
// @description Smart posts scrolling for vk.com
// @homepageURL https://github.com/nsknewbie/vk-posts-scroller
// @match       *://vk.com/*
// @run-at      document-end
// @grant       GM_addStyle
// @updateURL   https://github.com/nsknewbie/vk-posts-scroller/raw/master/vk.user.js
// @downloadURL https://github.com/nsknewbie/vk-posts-scroller/raw/master/vk.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (window.top !== window.self) {
        return;
    }

    const debounce = (fn, time) => {
        let timeout;

        return function () {
            const functionCall = () => fn.apply(this, arguments);

            clearTimeout(timeout);
            timeout = setTimeout(functionCall, time);
        };
    };
    const POST_SELECTOR = '.post[data-post-id]:not([data-ad-block-uid])';
    const menuHeight = document.querySelector('#page_header_cont').clientHeight;

    const feed = {
        activePost: void 0,

        hasScrollChecks: false,

        focusAfterHideOrRestorePost: debounce(function () {
            this.setActivePost(this.activePost);
        }, 150),

        setActivePost(post) {
            this.unsetActivePost();

            this.activePost = post;
            this.activePost.classList.add('vk-post-scroller--active-post');

            this.scrollToPost(post).then(() => {
                this.startScrollChecks();
            });
        },

        unsetActivePost() {
            this.activePost.classList.remove('vk-post-scroller--active-post');
            this.activePost = void 0;
            this.stopScrollChecks();
        },

        startScrollChecks() {
            if (!this.hasScrollChecks) {
                window.addEventListener('scroll', this.scrollCheck, { passive: true });
            }

            this.hasScrollChecks = true;
        },

        stopScrollChecks() {
            window.removeEventListener('scroll', this.scrollCheck);
            this.hasScrollChecks = false;
        },

        scrollCheck: debounce(() => {
            if (feed.isLayerShown()) {
                return;
            }

            if (!feed.isScrolledIntoView(feed.activePost)) {
                feed.unsetActivePost();
            }
        }, 100),

        isLayerShown() {
            return document.querySelector('body.layers_shown, body.article_body_layer') !== null;
        },

        isScrolledIntoView(element, completely = false) {
            const rect = element.getBoundingClientRect();

            return completely
                ? (rect.top >= 0) && (rect.bottom <= window.innerHeight)
                : (rect.top < window.innerHeight) && (rect.bottom >= 0);
        },

        scrollToPost(post) {
            const { top: screenTop, height: postHeight } = post.getBoundingClientRect();
            const offsetTop = Math.round(window.scrollY + screenTop - menuHeight) - Math.max(Math.ceil(window.innerHeight - menuHeight - postHeight) / 2, 0);

            return new Promise((resolve, reject) => {
                let timer;
                let scrollCallback = () => {
                    clearTimeout(timer);

                    timer = setTimeout(() => {
                        window.removeEventListener('scroll', scrollCallback);

                        resolve();
                    }, 50);
                };

                window.addEventListener('scroll', scrollCallback, { passive: true });

                setTimeout(() => {
                    window.removeEventListener('scroll', scrollCallback);

                    reject();
                }, 3000);

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth',
                });
            });
        },

        nextPost() {
            const posts = this.findPosts();
            const hasActivePost = !!this.activePost;

            if (!hasActivePost || posts.indexOf(this.activePost) === -1) {
                this.activePost = this.findVisiblePost(posts);
            }

            let next = posts[posts.indexOf(this.activePost) + (hasActivePost ? 1 : 0)];
            if (next) {
                this.setActivePost(next);
            }
        },

        prevPost() {
            const posts = this.findPosts();

            this.activePost = this.activePost || this.findVisiblePost(posts);
            let prev = posts[posts.indexOf(this.activePost) - 1] ?? posts[0];

            this.setActivePost(prev);
        },

        nextPhoto() {
            if (!this.activePost) {
                return;
            }

            let button = this.activePost.querySelector('.vkuiScrollArrow.vkuiScrollArrow--direction-right');

            button?.click();
        },

        prevPhoto() {
            if (!this.activePost) {
                return;
            }

            let button = this.activePost.querySelector('.vkuiScrollArrow.vkuiScrollArrow--direction-left');

            button?.click();
        },

        likePost() {
            if (!this.activePost) {
                return;
            }

            const link = this.activePost.querySelector('.PostButtonReactions');

            if (link) {
                link.click();

                link.dispatchEvent(new MouseEvent('mouseout', { 'view': window, 'bubbles': true, 'cancelable': true }));
            }
        },

        hideOrRestorePost() {
            if (!this.activePost) {
                return;
            }

            const link = this.activePost.querySelector('a[onclick*=".restorePost"]')
                || this.activePost.querySelector('a[onclick*=".deletePost"]')
                || this.activePost.querySelector('a[onclick*=".unignoreItem"]')
                || this.activePost.querySelector('a[onclick*=".ignoreItem"]');

            if (link) {
                link.click();

                this.focusAfterHideOrRestorePost();
            }
        },

        clearGarbage(postsContainer) {
            const adsPlaceholder = postsContainer.querySelector('#ads_feed_placeholder');
            if (adsPlaceholder) {
                const adsParent = adsPlaceholder.parentNode;
                adsParent.parentNode.removeChild(adsParent);
            }
        },

        findPosts() {
            let postsContainer = document.querySelector('#page_wall_posts') || document.querySelector('#feed_rows');
            if (!postsContainer) {
                return [];
            }

            feed.clearGarbage(postsContainer);

            return Array.from(postsContainer.querySelectorAll(POST_SELECTOR))
                .filter((post) => post.clientHeight > 0);
        },

        findVisiblePost(posts) {
            for (let i = 0; i < posts.length; i++) {
                const { top } = posts[i].getBoundingClientRect();

                if (top - menuHeight >= 0) {
                    return posts[i];
                }
            }

            return null;
        },
    };

    window.addEventListener('keydown', function (event) {
        if ('getValue' in document.activeElement || feed.isLayerShown()) {
            return;
        }

        switch (event.code) {
            case 'KeyW':
                feed.prevPost();
                break;
            case 'KeyS':
                feed.nextPost();
                break;
            case 'KeyA':
                feed.prevPhoto();
                break;
            case 'KeyD':
                feed.nextPhoto();
                break;
            case 'KeyF':
                feed.likePost();
                break;
            case 'KeyQ':
                feed.hideOrRestorePost();
                break;
        }
    });

    GM_addStyle(`
    .vk-post-scroller--active-post {
        box-shadow: rgba(89, 125, 163, 0.66) 0px 0px 5px 2px !important;
    }
    `);
})();
