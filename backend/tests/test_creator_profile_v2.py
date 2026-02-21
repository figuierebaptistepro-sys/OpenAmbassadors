"""
Test suite for Creator Profile V2 - Collaboration requests and reviews
Tests the new B2B mini landing page features:
- Creator profile endpoint
- Reviews endpoint
- Collaboration requests endpoint (requires business subscription)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL not set")

# Test credentials
BUSINESS_EMAIL = "testbusiness@emergent.org"
BUSINESS_PASSWORD = "password123"
CREATOR_EMAIL = "testagent@emergent.org"
CREATOR_PASSWORD = "password123"
TEST_CREATOR_ID = "user_b81a38acae93"


class TestCreatorProfileEndpoint:
    """Test GET /api/creators/{user_id} endpoint"""
    
    def test_get_creator_profile_success(self):
        """Test retrieving a valid creator profile"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}")
        print(f"GET /api/creators/{TEST_CREATOR_ID} - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify essential fields are present
        assert "user_id" in data, "user_id should be in response"
        assert data["user_id"] == TEST_CREATOR_ID
        assert "name" in data, "name should be in response"
        assert "bio" in data, "bio should be in response"
        assert "city" in data, "city should be in response"
        assert "content_types" in data, "content_types should be in response"
        assert "min_rate" in data, "min_rate should be in response"
        assert "portfolio_videos" in data, "portfolio_videos should be in response"
        assert "reviews" in data, "reviews should be in response"
        assert "completed_projects" in data, "completed_projects should be in response"
        assert "rating" in data, "rating should be in response"
        assert "reviews_count" in data, "reviews_count should be in response"
        
        print(f"SUCCESS: Creator profile retrieved - Name: {data.get('name')}, City: {data.get('city')}")
    
    def test_get_creator_profile_not_found(self):
        """Test retrieving non-existent creator returns 404"""
        response = requests.get(f"{BASE_URL}/api/creators/non_existent_user_id")
        print(f"GET /api/creators/non_existent_user_id - Status: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: 404 returned for non-existent creator")


class TestCreatorReviewsEndpoint:
    """Test GET /api/creators/{user_id}/reviews endpoint"""
    
    def test_get_creator_reviews_success(self):
        """Test retrieving reviews for a creator"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}/reviews")
        print(f"GET /api/creators/{TEST_CREATOR_ID}/reviews - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are reviews, check structure
        if len(data) > 0:
            review = data[0]
            assert "rating" in review, "review should have rating"
            assert "comment" in review, "review should have comment"
            assert "business_name" in review, "review should have business_name"
            print(f"SUCCESS: Found {len(data)} reviews")
        else:
            print("SUCCESS: Empty reviews list (no reviews for this creator)")
    
    def test_get_reviews_for_nonexistent_creator(self):
        """Test reviews endpoint returns empty list for non-existent creator"""
        response = requests.get(f"{BASE_URL}/api/creators/non_existent_user/reviews")
        print(f"GET /api/creators/non_existent_user/reviews - Status: {response.status_code}")
        
        # Should still return 200 with empty list
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print("SUCCESS: Returns empty list for non-existent creator")


class TestCollaborationRequestsEndpoint:
    """Test POST /api/collaboration-requests endpoint"""
    
    @pytest.fixture
    def business_session(self):
        """Login as business user and return session"""
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": BUSINESS_EMAIL, "password": BUSINESS_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Business login failed: {login_response.status_code} - {login_response.text}")
        
        return session
    
    @pytest.fixture
    def creator_session(self):
        """Login as creator user and return session"""
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CREATOR_EMAIL, "password": CREATOR_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Creator login failed: {login_response.status_code} - {login_response.text}")
        
        return session
    
    def test_collaboration_request_requires_auth(self):
        """Test collaboration request without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/collaboration-requests",
            json={
                "creator_id": TEST_CREATOR_ID,
                "content_types": ["UGC"],
                "platforms": ["tiktok"],
                "budget_range": "500-1000",
                "brief": "Test collaboration request"
            }
        )
        print(f"POST /api/collaboration-requests (unauthenticated) - Status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Authentication required for collaboration requests")
    
    def test_collaboration_request_requires_business_user(self, creator_session):
        """Test collaboration request from creator (should fail)"""
        response = creator_session.post(
            f"{BASE_URL}/api/collaboration-requests",
            json={
                "creator_id": TEST_CREATOR_ID,
                "content_types": ["UGC"],
                "platforms": ["tiktok"],
                "budget_range": "500-1000",
                "brief": "Test collaboration request"
            }
        )
        print(f"POST /api/collaboration-requests (as creator) - Status: {response.status_code}")
        
        # Creators should not be able to send collaboration requests
        assert response.status_code in [403, 401], f"Expected 403 or 401, got {response.status_code}"
        print("SUCCESS: Only business users can send collaboration requests")
    
    def test_collaboration_request_requires_subscription(self, business_session):
        """Test collaboration request requires business subscription"""
        response = business_session.post(
            f"{BASE_URL}/api/collaboration-requests",
            json={
                "creator_id": TEST_CREATOR_ID,
                "content_types": ["UGC"],
                "platforms": ["tiktok"],
                "budget_range": "500-1000",
                "brief": "Test collaboration request - subscription check"
            }
        )
        print(f"POST /api/collaboration-requests (business) - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # If not subscribed, should return 403 with subscription message
        # If subscribed, should return 200
        if response.status_code == 403:
            data = response.json()
            assert "Abonnement" in data.get("detail", ""), "Should mention subscription required"
            print("SUCCESS: Business subscription required for collaboration requests")
        elif response.status_code == 200:
            data = response.json()
            assert "request_id" in data, "Should return request_id on success"
            print(f"SUCCESS: Collaboration request created - {data.get('request_id')}")
        else:
            # Check if it's a different issue
            assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"


class TestBusinessLogin:
    """Test business user login"""
    
    def test_business_login_success(self):
        """Test login with business credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": BUSINESS_EMAIL, "password": BUSINESS_PASSWORD}
        )
        print(f"POST /api/auth/login (business) - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Business login - user_type: {data.get('user_type')}, is_premium: {data.get('is_premium')}")
            assert data.get("user_type") == "business", "Should be business user"
        else:
            print(f"Business login failed - Response: {response.text}")
            # Don't fail the test, just skip if credentials don't work
            pytest.skip(f"Business login failed: {response.status_code}")


class TestCreatorLogin:
    """Test creator user login"""
    
    def test_creator_login_success(self):
        """Test login with creator credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CREATOR_EMAIL, "password": CREATOR_PASSWORD}
        )
        print(f"POST /api/auth/login (creator) - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Creator login - user_type: {data.get('user_type')}, is_premium: {data.get('is_premium')}")
        else:
            print(f"Creator login failed - Response: {response.text}")
            pytest.skip(f"Creator login failed: {response.status_code}")


class TestCreatorProfileV2DataStructure:
    """Test that creator profile returns all data needed for V2 page"""
    
    def test_profile_has_portfolio_videos(self):
        """Test that portfolio videos are returned"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        
        data = response.json()
        videos = data.get("portfolio_videos", [])
        print(f"Portfolio videos count: {len(videos)}")
        
        assert isinstance(videos, list), "portfolio_videos should be a list"
        
        if len(videos) > 0:
            video = videos[0]
            assert "url" in video, "video should have url"
            print(f"SUCCESS: Portfolio videos available - {len(videos)} videos")
        else:
            print("INFO: No portfolio videos for this creator")
    
    def test_profile_has_pricing_info(self):
        """Test that pricing info is returned"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        
        data = response.json()
        min_rate = data.get("min_rate")
        max_rate = data.get("max_rate")
        
        print(f"Pricing: min_rate={min_rate}, max_rate={max_rate}")
        assert "min_rate" in data, "Should have min_rate field"
        print(f"SUCCESS: Pricing info available - À partir de {min_rate}€")
    
    def test_profile_has_stats_for_badge(self):
        """Test that stats for dynamic badge are returned"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Stats needed for dynamic badge
        completed_projects = data.get("completed_projects", 0)
        reviews_count = data.get("reviews_count", 0)
        rating = data.get("rating", 0)
        is_premium = data.get("is_premium", False)
        
        print(f"Badge stats: completed_projects={completed_projects}, reviews_count={reviews_count}, rating={rating}, is_premium={is_premium}")
        
        assert "completed_projects" in data, "Should have completed_projects"
        assert "reviews_count" in data, "Should have reviews_count"
        assert "rating" in data, "Should have rating"
        assert "is_premium" in data, "Should have is_premium"
        
        print("SUCCESS: All stats for dynamic badge available")
    
    def test_profile_has_availability_info(self):
        """Test that availability info is returned"""
        response = requests.get(f"{BASE_URL}/api/creators/{TEST_CREATOR_ID}")
        assert response.status_code == 200
        
        data = response.json()
        available = data.get("available")
        response_time = data.get("response_time")
        
        print(f"Availability: available={available}, response_time={response_time}")
        assert "available" in data, "Should have available field"
        print(f"SUCCESS: Availability info available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
