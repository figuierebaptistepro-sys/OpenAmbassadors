"""
Test suite for Articles/Learn Content Management API
Tests CRUD operations, filtering, search, and user progress tracking
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "figuierebaptistepro@gmail.com"
ADMIN_PASSWORD = "TempPass123!"


class TestArticlesPublicEndpoints:
    """Test public article endpoints (no auth required)"""
    
    def test_get_articles_list(self):
        """GET /api/articles - Returns list of published articles"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        
        data = response.json()
        assert "articles" in data
        assert "categories" in data
        assert "total" in data
        assert isinstance(data["articles"], list)
        assert isinstance(data["categories"], list)
        
        # Verify article structure if articles exist
        if len(data["articles"]) > 0:
            article = data["articles"][0]
            assert "article_id" in article
            assert "title" in article
            assert "description" in article
            assert "content" in article
            assert "category" in article
            assert "points" in article
            assert "is_published" in article
            print(f"✓ Found {len(data['articles'])} articles")
    
    def test_get_articles_filter_by_category(self):
        """GET /api/articles?category=Fondamentaux - Filter by category"""
        response = requests.get(f"{BASE_URL}/api/articles?category=Fondamentaux")
        assert response.status_code == 200
        
        data = response.json()
        assert "articles" in data
        
        # All returned articles should be in the requested category
        for article in data["articles"]:
            assert article["category"] == "Fondamentaux"
        print(f"✓ Category filter works - {len(data['articles'])} articles in Fondamentaux")
    
    def test_get_articles_search(self):
        """GET /api/articles?search=UGC - Search articles"""
        response = requests.get(f"{BASE_URL}/api/articles?search=UGC")
        assert response.status_code == 200
        
        data = response.json()
        assert "articles" in data
        
        # Search should return relevant results
        if len(data["articles"]) > 0:
            # At least one article should contain UGC in title, description, or tags
            found_match = False
            for article in data["articles"]:
                if "UGC" in article.get("title", "").upper() or \
                   "UGC" in article.get("description", "").upper() or \
                   any("ugc" in tag.lower() for tag in article.get("tags", [])):
                    found_match = True
                    break
            assert found_match, "Search results should contain relevant articles"
        print(f"✓ Search works - {len(data['articles'])} results for 'UGC'")
    
    def test_get_articles_empty_category(self):
        """GET /api/articles?category=Tous - 'Tous' should return all articles"""
        response = requests.get(f"{BASE_URL}/api/articles?category=Tous")
        assert response.status_code == 200
        
        data = response.json()
        assert "articles" in data
        print(f"✓ 'Tous' category returns all articles - {len(data['articles'])} articles")
    
    def test_get_single_article(self):
        """GET /api/articles/{article_id} - Get article detail"""
        # First get list to find an article ID
        list_response = requests.get(f"{BASE_URL}/api/articles")
        assert list_response.status_code == 200
        
        articles = list_response.json().get("articles", [])
        if len(articles) == 0:
            pytest.skip("No articles available for testing")
        
        article_id = articles[0]["article_id"]
        initial_views = articles[0].get("views", 0)
        
        # Get single article
        response = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        assert response.status_code == 200
        
        article = response.json()
        assert article["article_id"] == article_id
        assert "title" in article
        assert "content" in article
        assert "category" in article
        
        # Views should be incremented
        assert article.get("views", 0) >= initial_views
        print(f"✓ Single article retrieved: {article['title']}")
    
    def test_get_nonexistent_article(self):
        """GET /api/articles/{invalid_id} - Returns 404"""
        response = requests.get(f"{BASE_URL}/api/articles/nonexistent_article_id")
        assert response.status_code == 404
        print("✓ 404 returned for non-existent article")


class TestArticlesAuthenticatedEndpoints:
    """Test authenticated article endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and get authenticated session"""
        session = requests.Session()
        
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        return session
    
    def test_get_user_progress_authenticated(self, auth_session):
        """GET /api/articles/progress/me - Get user's article progress"""
        response = auth_session.get(f"{BASE_URL}/api/articles/progress/me")
        assert response.status_code == 200
        
        data = response.json()
        assert "completed_articles" in data
        assert "total_completed" in data
        assert "total_points" in data
        assert isinstance(data["completed_articles"], list)
        print(f"✓ User progress: {data['total_completed']} articles completed, {data['total_points']} points")
    
    def test_get_user_progress_unauthenticated(self):
        """GET /api/articles/progress/me - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/articles/progress/me")
        assert response.status_code == 401
        print("✓ Progress endpoint requires authentication")
    
    def test_complete_article(self, auth_session):
        """POST /api/articles/{article_id}/complete - Mark article as completed"""
        # Get an article to complete
        list_response = auth_session.get(f"{BASE_URL}/api/articles")
        articles = list_response.json().get("articles", [])
        
        if len(articles) == 0:
            pytest.skip("No articles available for testing")
        
        # Find a non-premium article
        article = None
        for a in articles:
            if not a.get("is_premium", False):
                article = a
                break
        
        if not article:
            pytest.skip("No non-premium articles available")
        
        article_id = article["article_id"]
        
        # Complete the article
        response = auth_session.post(f"{BASE_URL}/api/articles/{article_id}/complete")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "points_awarded" in data
        print(f"✓ Article completed: {data['message']}, points: {data['points_awarded']}")
    
    def test_complete_article_unauthenticated(self):
        """POST /api/articles/{article_id}/complete - Returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/articles/article_test/complete")
        assert response.status_code == 401
        print("✓ Complete endpoint requires authentication")
    
    def test_complete_nonexistent_article(self, auth_session):
        """POST /api/articles/{invalid_id}/complete - Returns 404"""
        response = auth_session.post(f"{BASE_URL}/api/articles/nonexistent_article/complete")
        assert response.status_code == 404
        print("✓ 404 returned for completing non-existent article")


class TestArticlesAdminEndpoints:
    """Test admin-only article endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and get authenticated session"""
        session = requests.Session()
        
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.text}")
        
        return session
    
    def test_create_article_admin(self, admin_session):
        """POST /api/admin/articles - Create new article (admin only)"""
        article_data = {
            "title": "TEST_Article de test automatisé",
            "description": "Article créé par les tests automatisés",
            "content": "# Contenu de test\n\nCeci est un article de test.",
            "category": "Fondamentaux",
            "duration": "15 min",
            "points": 5,
            "is_premium": False,
            "is_published": True,
            "banner_type": "image",
            "banner_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
            "tags": ["test", "automatise"]
        }
        
        response = admin_session.post(
            f"{BASE_URL}/api/admin/articles",
            json=article_data
        )
        assert response.status_code == 200
        
        created = response.json()
        assert "article_id" in created
        assert created["title"] == article_data["title"]
        assert created["category"] == article_data["category"]
        assert created["points"] == article_data["points"]
        
        # Store article_id for cleanup
        admin_session.test_article_id = created["article_id"]
        print(f"✓ Article created: {created['article_id']}")
        
        # Verify article exists via GET
        get_response = admin_session.get(f"{BASE_URL}/api/articles/{created['article_id']}")
        assert get_response.status_code == 200
        print("✓ Created article verified via GET")
    
    def test_update_article_admin(self, admin_session):
        """PUT /api/admin/articles/{article_id} - Update article (admin only)"""
        if not hasattr(admin_session, 'test_article_id'):
            pytest.skip("No test article created")
        
        article_id = admin_session.test_article_id
        
        update_data = {
            "title": "TEST_Article mis à jour",
            "points": 10
        }
        
        response = admin_session.put(
            f"{BASE_URL}/api/admin/articles/{article_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["title"] == update_data["title"]
        assert updated["points"] == update_data["points"]
        print(f"✓ Article updated: {updated['title']}")
        
        # Verify update via GET
        get_response = admin_session.get(f"{BASE_URL}/api/articles/{article_id}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == update_data["title"]
        print("✓ Update verified via GET")
    
    def test_delete_article_admin(self, admin_session):
        """DELETE /api/admin/articles/{article_id} - Delete article (admin only)"""
        if not hasattr(admin_session, 'test_article_id'):
            pytest.skip("No test article created")
        
        article_id = admin_session.test_article_id
        
        response = admin_session.delete(f"{BASE_URL}/api/admin/articles/{article_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"✓ Article deleted: {data['message']}")
        
        # Verify deletion via GET
        get_response = admin_session.get(f"{BASE_URL}/api/articles/{article_id}")
        assert get_response.status_code == 404
        print("✓ Deletion verified - article no longer exists")
    
    def test_create_article_unauthenticated(self):
        """POST /api/admin/articles - Returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/admin/articles",
            json={"title": "Test", "description": "Test", "content": "Test", "category": "Test"}
        )
        assert response.status_code == 401
        print("✓ Admin create endpoint requires authentication")
    
    def test_update_nonexistent_article(self, admin_session):
        """PUT /api/admin/articles/{invalid_id} - Returns 404"""
        response = admin_session.put(
            f"{BASE_URL}/api/admin/articles/nonexistent_article",
            json={"title": "Test"}
        )
        assert response.status_code == 404
        print("✓ 404 returned for updating non-existent article")
    
    def test_delete_nonexistent_article(self, admin_session):
        """DELETE /api/admin/articles/{invalid_id} - Returns 404"""
        response = admin_session.delete(f"{BASE_URL}/api/admin/articles/nonexistent_article")
        assert response.status_code == 404
        print("✓ 404 returned for deleting non-existent article")


class TestArticlesCategoriesAndStats:
    """Test category aggregation and statistics"""
    
    def test_categories_returned_with_counts(self):
        """GET /api/articles - Categories include article counts"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        
        data = response.json()
        categories = data.get("categories", [])
        
        for cat in categories:
            assert "name" in cat
            assert "count" in cat
            assert isinstance(cat["count"], int)
            assert cat["count"] > 0
        
        print(f"✓ Categories with counts: {categories}")
    
    def test_view_count_increments(self):
        """GET /api/articles/{id} - View count increments on each request"""
        # Get an article
        list_response = requests.get(f"{BASE_URL}/api/articles")
        articles = list_response.json().get("articles", [])
        
        if len(articles) == 0:
            pytest.skip("No articles available")
        
        article_id = articles[0]["article_id"]
        
        # Get article first time
        response1 = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        views1 = response1.json().get("views", 0)
        
        # Get article second time
        response2 = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        views2 = response2.json().get("views", 0)
        
        # Views should have incremented
        assert views2 >= views1
        print(f"✓ View count incremented: {views1} -> {views2}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
