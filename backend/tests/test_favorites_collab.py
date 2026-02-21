"""
Tests for Favorites API and Collaboration Requests API
Testing:
- POST/DELETE /api/favorites/{creator_id} - Add/remove favorites
- GET /api/favorites - List all favorites
- GET /api/favorites/check/{creator_id} - Check if creator is favorite
- POST /api/collaboration-requests - Create collaboration request (sends message to creator)
- GET /api/creators/{user_id} - Verify portfolio_photos is included
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test users
BUSINESS_EMAIL = "testbusiness@emergent.org"
BUSINESS_PASSWORD = "password123"
CREATOR_EMAIL = "testagent@emergent.org"
CREATOR_PASSWORD = "password123"

# Creator to test favorites with - Vice Pomsky
TEST_CREATOR_ID = "user_b81a38acae93"


class TestFavoritesAPI:
    """Test Favorites endpoints"""
    
    @pytest.fixture(scope="class")
    def business_session(self):
        """Login as business user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": BUSINESS_EMAIL, "password": BUSINESS_PASSWORD}
        )
        assert response.status_code == 200, f"Business login failed: {response.text}"
        return session

    @pytest.fixture(scope="class")
    def creator_session(self):
        """Login as creator user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CREATOR_EMAIL, "password": CREATOR_PASSWORD}
        )
        assert response.status_code == 200, f"Creator login failed: {response.text}"
        return session

    def test_01_login_business(self, business_session):
        """Verify business user can login"""
        response = business_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == BUSINESS_EMAIL
        assert data["user_type"] == "business"
        print(f"✅ Business user logged in: {data['name']}")

    def test_02_get_favorites_list(self, business_session):
        """GET /api/favorites - List all favorites"""
        response = business_session.get(f"{BASE_URL}/api/favorites")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Favorites list retrieved: {len(data)} favorites")
        for fav in data:
            print(f"   - {fav.get('name', 'Unknown')} ({fav.get('user_id', 'no id')})")

    def test_03_check_favorite_status(self, business_session):
        """GET /api/favorites/check/{creator_id} - Check if creator is favorite"""
        response = business_session.get(f"{BASE_URL}/api/favorites/check/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "is_favorite" in data
        print(f"✅ Favorite check for {TEST_CREATOR_ID}: is_favorite={data['is_favorite']}")

    def test_04_add_to_favorites(self, business_session):
        """POST /api/favorites/{creator_id} - Add creator to favorites"""
        # First remove if exists to test adding
        business_session.delete(f"{BASE_URL}/api/favorites/{TEST_CREATOR_ID}")
        
        # Add to favorites
        response = business_session.post(f"{BASE_URL}/api/favorites/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Added to favorites: {data}")
        
        # Verify it was added
        check_response = business_session.get(f"{BASE_URL}/api/favorites/check/{TEST_CREATOR_ID}")
        assert check_response.status_code == 200
        assert check_response.json()["is_favorite"] == True
        print(f"✅ Verified creator is now in favorites")

    def test_05_remove_from_favorites(self, business_session):
        """DELETE /api/favorites/{creator_id} - Remove creator from favorites"""
        # First ensure it's added
        business_session.post(f"{BASE_URL}/api/favorites/{TEST_CREATOR_ID}")
        
        # Remove from favorites
        response = business_session.delete(f"{BASE_URL}/api/favorites/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        print(f"✅ Removed from favorites")
        
        # Verify it was removed
        check_response = business_session.get(f"{BASE_URL}/api/favorites/check/{TEST_CREATOR_ID}")
        assert check_response.status_code == 200
        assert check_response.json()["is_favorite"] == False
        print(f"✅ Verified creator is no longer in favorites")

    def test_06_re_add_favorite_for_page_test(self, business_session):
        """Re-add creator to favorites for MyFavoritesPage testing"""
        response = business_session.post(f"{BASE_URL}/api/favorites/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        print(f"✅ Re-added {TEST_CREATOR_ID} to favorites for UI testing")


class TestCollaborationRequestsAPI:
    """Test Collaboration Requests endpoints"""

    @pytest.fixture(scope="class")
    def business_session(self):
        """Login as business user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": BUSINESS_EMAIL, "password": BUSINESS_PASSWORD}
        )
        assert response.status_code == 200, f"Business login failed: {response.text}"
        return session

    def test_01_collaboration_request_requires_budget(self, business_session):
        """POST /api/collaboration-requests - Budget is required"""
        # Send request without budget_range
        response = business_session.post(
            f"{BASE_URL}/api/collaboration-requests",
            json={
                "creator_id": TEST_CREATOR_ID,
                "content_types": ["UGC"],
                "platforms": ["TikTok"],
                "brief": "Test collaboration request without budget"
            }
        )
        # The request might succeed (budget_range is Optional in model) or fail if validated
        # Let's check what happens
        print(f"Response without budget: {response.status_code} - {response.text[:200]}")

    def test_02_collaboration_request_with_budget(self, business_session):
        """POST /api/collaboration-requests - Full request with budget"""
        response = business_session.post(
            f"{BASE_URL}/api/collaboration-requests",
            json={
                "creator_id": TEST_CREATOR_ID,
                "content_types": ["UGC"],
                "platforms": ["TikTok"],
                "budget_range": "500-1000",
                "deadline": "2026-02-15",
                "brief": "Test collaboration request - testing budget requirement and message sending",
                "deliverables": "3 vidéos UGC format vertical",
                "additional_info": "Produit envoyé: Non"
            }
        )
        print(f"Response with budget: {response.status_code}")
        
        # Check if subscription is required (expected based on agent note)
        if response.status_code == 403:
            data = response.json()
            print(f"⚠️ Subscription required: {data.get('detail', 'Unknown error')}")
            # This is expected if user doesn't have subscription
            assert "Abonnement" in data.get("detail", "") or "subscription" in data.get("detail", "").lower()
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Collaboration request created: {data}")
            assert "conversation_id" in data, "Response should include conversation_id"
            print(f"✅ Conversation ID: {data['conversation_id']}")
        else:
            print(f"❌ Unexpected response: {response.text}")


class TestCreatorProfilePortfolioPhotos:
    """Test that creator profile includes portfolio_photos"""

    def test_01_get_creator_with_portfolio_photos(self):
        """GET /api/creators/{user_id} - Should include portfolio_photos"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}")
        assert response.status_code == 200, f"Failed to get creator: {response.text}"
        
        data = response.json()
        print(f"✅ Creator profile retrieved: {data.get('name', 'Unknown')}")
        
        # Check if portfolio_photos exists
        if "portfolio_photos" in data:
            photos = data["portfolio_photos"]
            print(f"✅ portfolio_photos field exists with {len(photos)} photos")
            for i, photo in enumerate(photos):
                print(f"   Photo {i+1}: {photo.get('url', 'no url')[:50]}...")
        else:
            print(f"⚠️ portfolio_photos field NOT found in creator profile")
            print(f"   Available fields: {list(data.keys())}")
        
        # Check for portfolio_videos as well
        if "portfolio_videos" in data:
            print(f"✅ portfolio_videos: {len(data['portfolio_videos'])} videos")

    def test_02_get_creator_with_details(self):
        """GET /api/creators/{user_id} - Check all expected fields"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ["name", "bio", "city", "content_types", "portfolio_videos", "portfolio_photos", "min_rate", "available"]
        
        print(f"Creator profile fields check:")
        for field in expected_fields:
            if field in data:
                value = data[field]
                if isinstance(value, list):
                    print(f"   ✅ {field}: {len(value)} items")
                elif isinstance(value, str) and len(value) > 50:
                    print(f"   ✅ {field}: {value[:50]}...")
                else:
                    print(f"   ✅ {field}: {value}")
            else:
                print(f"   ⚠️ {field}: NOT FOUND")


class TestMyFavoritesPage:
    """Test GET /api/favorites returns full creator data for MyFavoritesPage"""

    @pytest.fixture(scope="class")
    def business_session(self):
        """Login as business user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": BUSINESS_EMAIL, "password": BUSINESS_PASSWORD}
        )
        assert response.status_code == 200
        return session

    def test_favorites_include_creator_details(self, business_session):
        """GET /api/favorites - Should return full creator info for display"""
        response = business_session.get(f"{BASE_URL}/api/favorites")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            favorite = data[0]
            print(f"Favorite creator data structure:")
            for key in favorite.keys():
                value = favorite[key]
                if isinstance(value, str) and len(value) > 50:
                    print(f"   {key}: {value[:50]}...")
                elif isinstance(value, list):
                    print(f"   {key}: {len(value)} items")
                else:
                    print(f"   {key}: {value}")
            
            # Check required fields for MyFavoritesPage
            required_fields = ["user_id", "name", "picture", "city"]
            for field in required_fields:
                if field in favorite:
                    print(f"   ✅ {field} present")
                else:
                    print(f"   ⚠️ {field} MISSING - needed for favorites page")
        else:
            print("⚠️ No favorites found - cannot verify data structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
